# HYPE — Architecture

## System overview

```mermaid
flowchart TB
  subgraph Browser
    L["Landing / Market / Asset / Portfolio /<br/>Leaderboard / Ledger (Proof of Solvency)"]
    SWR["SWR polling: market 4s · integrity 2s · me 5s"]
  end

  subgraph Vercel["Vercel — serverless Next.js 15"]
    direction TB
    MW["HMAC-signed cookie session<br/>(stateless, no session store)"]
    R1["/api/market · /api/asset/:symbol<br/>/api/portfolio · /api/leaderboard"]
    R2["/api/trade (POST)"]
    R3["/api/integrity"]
    ENG["Settlement engine (src/lib/engine.ts)<br/>BigInt bonding-curve math<br/>withTx(): OCC retry on 40001/40P01<br/>backoff + jitter, max 8 attempts"]
  end

  subgraph AWS
    DSQL[("Amazon Aurora DSQL<br/>PostgreSQL-compatible · serverless<br/>active-active multi-region<br/>strong snapshot isolation (OCC)<br/>IAM token auth via @aws-sdk/dsql-signer")]
  end

  L --> SWR --> R1
  L --> R2
  L --> R3
  MW -.identifies.-> R1 & R2 & R3
  R2 --> ENG
  R1 --> DSQL
  R3 --> DSQL
  ENG --> DSQL
```

## The settlement transaction (the heart)

Every trade is **one ACID transaction** that touches at most 4 rows:

```mermaid
sequenceDiagram
  participant U as Trader
  participant API as /api/trade
  participant E as Engine (withTx)
  participant D as Aurora DSQL

  U->>API: POST {symbol, side, qty}
  API->>E: executeTrade(user, symbol, side, qty)
  E->>D: BEGIN
  E->>D: SELECT asset (base, slope, supply, reserve)
  E->>D: SELECT user cash / holding qty
  Note over E: BigInt curve math:<br/>cost = q·base + slope·(s·q + q(q−1)/2)
  E->>D: UPDATE users SET cash = cash − cost
  E->>D: UPDATE assets SET supply += q, reserve += cost
  E->>D: INSERT/UPDATE holdings (composite PK upsert)
  E->>D: INSERT trades (append-only tape)
  E->>D: COMMIT
  alt another trade touched the same rows
    D-->>E: ABORT — SQLSTATE 40001 (OCC conflict)
    E->>E: backoff + jitter, re-read, recompute
    E->>D: retry transaction (max 8)
  end
  E-->>API: fill report (+ retry count)
  API-->>U: "Filled 25 CAPY · 2 OCC retries"
```

Key property: the cost is **recomputed from a fresh read on every retry**, so a conflicting concurrent trade can never make the engine settle at a stale price. This is what keeps invariant 2 (`reserve === R(supply)`) exact under fire.

## Data model

```mermaid
erDiagram
  USERS {
    uuid id PK
    varchar username
    bigint cash "micro-units"
    bigint granted "all $H ever minted to this account"
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
    bigint base_price "micro"
    bigint slope "micro per share"
    bigint supply "whole shares"
    bigint reserve "micro locked in curve"
    timestamptz created_at
  }
  HOLDINGS {
    uuid user_id PK
    uuid asset_id PK
    bigint qty
    bigint cost_basis "micro, proportional on sells"
    timestamptz updated_at
  }
  TRADES {
    uuid id PK
    uuid user_id
    uuid asset_id
    varchar side
    bigint qty
    bigint price "avg micro per share"
    bigint total "micro"
    timestamptz created_at
  }
  USERS ||--o{ HOLDINGS : holds
  ASSETS ||--o{ HOLDINGS : held_as
  USERS ||--o{ TRADES : prints
  ASSETS ||--o{ TRADES : traded
```

DSQL-deliberate decisions:

| Decision | Reason |
|---|---|
| UUIDs minted in the app, no `SERIAL` | DSQL has no sequences; also removes a coordination point |
| No foreign keys | DSQL doesn't enforce them; integrity lives in the settlement transaction, which is the only write path |
| Composite PK on `holdings(user_id, asset_id)` | Two concurrent *first* buys of the same pair conflict on the PK; one aborts into the retry path and lands on the UPDATE branch — an OCC-safe upsert without `ON CONFLICT` gymnastics |
| `CREATE INDEX ASYNC` on DSQL | DSQL builds secondary indexes as background jobs; `scripts/db-setup.ts` rewrites the portable schema automatically |
| `granted` column on users | Makes "Σ minted" a `SUM()` instead of an event-sourcing replay — the audit is one SQL statement |

## Proof of Solvency

`/api/integrity` recomputes from live data:

1. `Σ cash + Σ reserve === Σ granted` — drift reported in micro-units (must be `0`).
2. For every asset: `reserve === s·base + slope·s(s−1)/2`.

The `/ledger` page polls it every 2 seconds and renders the equation with both the $H view and the raw micro-unit integers — so the audience can watch the audit hold while `npm run sim:pump` floods the engine.

## Environment matrix

| Variable | Local dev | Aurora DSQL |
|---|---|---|
| `DATABASE_URL` | `postgresql://hype:hype@localhost:5432/hype` | *(unset)* |
| `DSQL_ENDPOINT` | — | `xxxx.dsql.us-east-1.on.aws` |
| `AWS_REGION` / keys | — | required (IAM token signing) |
| `DSQL_USER` | — | `admin` |
| `SESSION_SECRET` | any string | long random string |

`DATABASE_URL`, when present, wins — that's the explicit dev override.
