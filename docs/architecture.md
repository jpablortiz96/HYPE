# HYPE Architecture

HYPE is a culture exchange built on Next.js, Vercel, and Amazon Aurora DSQL. The
application is designed around one principle: the database is the trust boundary.
The UI can be playful, but settlement and solvency are verified from durable state.

## System Overview

```mermaid
flowchart TB
  subgraph Browser["Browser"]
    UI["Next.js App Router pages\n/, /market, /asset/:symbol, /portfolio,\n/ledger, /pro, /list, /campaigns, /leagues,\n/profile/:slug, /leaderboard"]
    SWR["SWR polling\nmarket 4s, integrity 2s, user 5s"]
  end

  subgraph Vercel["Vercel Serverless"]
    Session["HMAC session cookie\nstateless guest accounts"]
    ReadAPI["Read APIs\n/api/market, /api/asset, /api/portfolio,\n/api/pro, /api/scout, /api/campaigns,\n/api/leagues, /api/profile"]
    TradeAPI["/api/trade\nnodejs runtime, force-dynamic"]
    ListAPI["/api/list\nTrend IPO creation"]
    IntegrityAPI["/api/integrity\nProof of Solvency"]
    Engine["Settlement engine\nBigInt micro-units\nbonding curve math\nwithTx OCC retries"]
    Integrity["Integrity engine\nrecompute ledger and curve invariants"]
  end

  subgraph AWS["AWS"]
    Signer["@aws-sdk/dsql-signer\nshort-lived IAM auth tokens"]
    DSQL[("Amazon Aurora DSQL\nPostgreSQL-compatible\nACID transactions\nstrong snapshot isolation\noptimistic concurrency control")]
  end

  UI --> SWR
  SWR --> ReadAPI
  SWR --> IntegrityAPI
  UI --> TradeAPI
  UI --> ListAPI
  Session -. identifies .-> ReadAPI
  Session -. identifies .-> TradeAPI
  Session -. identifies .-> ListAPI
  TradeAPI --> Engine
  ListAPI --> DSQL
  ReadAPI --> DSQL
  IntegrityAPI --> Integrity
  Integrity --> DSQL
  Engine --> DSQL
  Signer --> DSQL
```

SVG version: [architecture.svg](architecture.svg)

## Request Flow

### Read paths

Most pages are read-heavy:

- `/market` reads asset stats, 24h volume, change, sponsored/new/hot signals, and sparkline points.
- `/asset/[symbol]` reads a single asset terminal, chart series, recent tape, and current user position.
- `/pro` derives B2B analytics from existing assets and trades.
- `/portfolio` reads holdings plus `/api/scout` for the Trend Scout Score.
- `/campaigns`, `/leagues`, and `/profile/[slug]` are product surfaces derived from current market data.
- `/ledger` polls `/api/integrity` every two seconds.

These routes do not move money.

### Write paths

There are two important write paths:

- `/api/trade` calls `executeTrade()` and moves cash, reserves, holdings, and trade tape entries.
- `/api/list` creates a new cultural asset with initial `supply = 0` and `reserve = 0`, which preserves
  `reserveAt(base, slope, 0) === 0`.

The trading engine is the critical path. Listing creates metadata and a clean curve; it does not alter
existing balances, reserves, or treasury funds.

## Settlement Transaction

Every trade is one ACID transaction:

```mermaid
sequenceDiagram
  participant User as Trader
  participant API as /api/trade
  participant Tx as withTx()
  participant DB as Aurora DSQL

  User->>API: POST {symbol, side, qty}
  API->>Tx: executeTrade(userId, symbol, side, qty)
  Tx->>DB: BEGIN
  Tx->>DB: SELECT asset base, slope, supply, reserve
  Tx->>DB: SELECT user cash and holding
  Note over Tx: BigInt curve math only
  Tx->>DB: UPDATE users
  Tx->>DB: UPDATE assets
  Tx->>DB: INSERT or UPDATE holdings
  Tx->>DB: INSERT trades
  Tx->>DB: COMMIT
  alt OCC conflict
    DB-->>Tx: 40001 / OC000 change conflict
    Tx->>Tx: rollback, backoff with jitter, retry fresh
    Tx->>DB: re-read and recompute
  end
  Tx-->>API: fill report and retry count
  API-->>User: settled trade preview/result
```

The cost is recomputed after every retry. A stale quote is never committed after a
concurrent trade changes supply.

## Transaction Modes

HYPE supports local Postgres and Aurora DSQL through the same code path.

```ts
await client.query(isDsql() ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ");
```

- Aurora DSQL uses `BEGIN` because DSQL already provides strong snapshot isolation.
- Local Postgres uses `REPEATABLE READ` so hot-row conflicts surface as retryable errors instead of
  silently allowing lost updates.

Retryable transaction errors include:

- SQLSTATE `40001`
- SQLSTATE `40P01`
- messages containing `OC000`
- messages containing `change conflicts with another transaction`

Backoff uses a 25ms base, jitter, and a 1000ms cap. The current engine allows up to 64 attempts
for high-contention demo bursts.

## Data Model

```mermaid
erDiagram
  USERS {
    uuid id PK
    varchar username
    bigint cash
    bigint granted
    boolean is_bot
    timestamptz created_at
  }
  ASSETS {
    uuid id PK
    varchar symbol
    varchar name
    varchar category
    varchar emoji
    varchar region
    bigint base_price
    bigint slope
    bigint supply
    bigint reserve
    boolean is_sponsored
    varchar sponsor_name
    varchar sponsor_type
    text origin_story
    timestamptz created_at
  }
  HOLDINGS {
    uuid user_id PK
    uuid asset_id PK
    bigint qty
    bigint cost_basis
    timestamptz updated_at
  }
  TRADES {
    uuid id PK
    uuid user_id
    uuid asset_id
    varchar side
    bigint qty
    bigint price
    bigint total
    timestamptz created_at
  }
```

Design choices for DSQL:

| Choice | Reason |
|---|---|
| App-minted UUIDs | Avoids sequences and removes a global coordination point. |
| No foreign keys | DSQL does not enforce them; the settlement transaction is the integrity boundary. |
| Composite `holdings(user_id, asset_id)` key | First-buy races become deterministic OCC conflicts. |
| `users.granted` | Makes total minted money a direct aggregate. |
| `CREATE INDEX ASYNC` | Required for Aurora DSQL secondary index creation. |

## Invariants

HYPE verifies two exact invariants:

```txt
sum(user.cash) + sum(asset.reserve) === sum(user.granted)
asset.reserve === reserveAt(base, slope, supply)
```

Because money is stored as integer micro-units, the check is exact. There is no floating
point tolerance and no reconciliation process.

## Product Layers On Top Of The Ledger

The current app builds several read-only or analytics surfaces on top of the exchange:

- Market board filters and badges.
- Market depth / slippage simulator.
- HYPE Pro analytics.
- Trend Scout Score.
- Sponsored IPOs.
- Creator Revenue Engine / royalty simulation.
- Brand Campaign Missions.
- Culture Leagues.
- Creator and brand profiles.

These layers are intentionally separated from settlement. They make the product feel
venture-scale without changing the ledger math.
