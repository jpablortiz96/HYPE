# HYPE — The Culture Exchange

**A planet-scale stock market for culture — memes, sounds and trends — where every trade settles on Amazon Aurora DSQL and the exchange proves its own solvency, live, to the micro-unit.**

Built for the **H0 Hackathon — Hack the Zero Stack** (Vercel v0 + AWS Databases) · Track 3: Million-scale.

---

## The pitch in 30 seconds

Culture already behaves like a market: a sound from Medellín explodes, a meme from CDMX peaks and crashes, a trend out of São Paulo mints winners and bagholders. HYPE makes that market real. Every cultural asset trades on a transparent **bonding curve** — buying mints shares and pushes the price up, selling burns them and pulls it down. No order book theater, no hidden market maker.

The hard part isn't the game. It's the ledger. A market for the whole internet means **thousands of concurrent trades mutating the same hot rows** — wallets, supplies, reserves. Most demos fake this. HYPE doesn't:

> **The Insolvency Test:** fire hundreds of concurrent trades at the exchange while a public audit page recomputes, every 2 seconds, the equation `Σ user cash + Σ curve reserves = Σ money ever minted`. The drift counter stays at **0 micro-units. Exactly. Always.**

That guarantee is not clever application code. It is **Amazon Aurora DSQL** doing what it was built for.

## Why Aurora DSQL (a deliberate choice, not a checkbox)

| Exchange requirement | What Aurora DSQL provides |
|---|---|
| Trades must never partially apply | Full ACID PostgreSQL-compatible transactions |
| Concurrent trades on the same asset must not corrupt the curve | **Strong snapshot isolation with optimistic concurrency control** — conflicting commits abort with SQLSTATE `40001`; the engine retries with a fresh read. No locks, no lock manager to melt down |
| A culture market is global by definition | **Active-active multi-region** — there is no single write master to shard around. A trader in Bogotá and one in Tokyo write to the same logical database |
| Viral spikes are the business model | Serverless, scales to zero, no connection-pool ceiling to babysit |
| Money must be auditable | IAM auth (no static DB passwords) + a schema designed so solvency is a single SQL query |

The engine treats `40001` as **normal operation**, not an error: `withTx()` in [`src/lib/db.ts`](src/lib/db.ts) retries with exponential backoff + jitter (max 8 attempts) and reports retry counts all the way up to the UI — after a contested trade the trade desk literally tells you *"settled · 3 OCC retries"*.

> Schema decisions made *for* DSQL, visible in [`db/schema.sql`](db/schema.sql): no sequences (UUIDs minted in the app), no foreign keys (integrity enforced by the settlement transaction), composite primary key on `holdings(user_id, asset_id)` so concurrent first-buys conflict on the PK and resolve through the OCC retry path, and secondary indexes created with `CREATE INDEX ASYNC` when targeting DSQL.

## The math that makes drift impossible

All money is **integer micro-units** (`1 $H = 1,000,000 micro`, BigInt everywhere). Shares are whole integers. The bonding curve is linear and discrete:

```
Spot price at supply s:   P(s) = base + slope·s
Buy q shares:             cost = q·base + slope·(s·q + q(q−1)/2)
Sell q shares:            proceeds = q·base + slope·(s·q − q(q+1)/2)
Reserve at supply s:      R(s) = s·base + slope·s(s−1)/2
```

A round-trip of one share nets exactly 0 (before fees), so two invariants hold **exactly** — `==`, not `epsilon`:

1. `Σ user cash + Σ asset reserve === Σ minted` (money is conserved)
2. per asset: `stored reserve === R(supply)` (the curve never lied)

A 1% fee on sells routes to the `HYPE_TREASURY` account — that's the revenue line, and it preserves invariant 1 because the fee is a transfer, not a burn.

`npm run verify:math` proves both invariants over ~200,000 randomized in-memory trades. `npm run sim:pump` proves them under real concurrency against the real database.

## Architecture

```mermaid
flowchart LR
  subgraph Client["Browser (instant play, no signup)"]
    UI["Next.js 15 UI<br/>amber terminal · SWR live polling"]
  end
  subgraph Vercel["Vercel (serverless)"]
    API["API routes<br/>/api/trade · /api/market · /api/integrity …"]
    ENGINE["Settlement engine<br/>BigInt curve math · OCC retry (40001)"]
  end
  subgraph AWS["AWS"]
    DSQL[("Amazon Aurora DSQL<br/>active-active · strong snapshot isolation<br/>IAM token auth")]
  end
  UI -->|"fetch + cookies (HMAC session)"| API --> ENGINE -->|"pg + @aws-sdk/dsql-signer"| DSQL
```

Full diagram with data model: [`docs/architecture.md`](docs/architecture.md) · [`docs/architecture.svg`](docs/architecture.svg)

### Data model (4 tables)

- **users** — `cash` and `granted` in micro-units; `granted` records every $H ever minted to that account, which is what makes the solvency audit one query.
- **assets** — `base_price`, `slope`, `supply`, `reserve`; price is *derived*, never stored.
- **holdings** — composite PK `(user_id, asset_id)`, integer `qty`, proportional `cost_basis`.
- **trades** — append-only tape; powers charts, 24h stats and the leaderboard.

## Run it locally (5 minutes)

```powershell
git clone https://github.com/jpablortiz96/hype.git
cd hype
npm install
copy .env.example .env          # defaults work for local mode

docker compose up -d            # local PostgreSQL 16 on :5432
# In .env, uncomment: DATABASE_URL=postgresql://hype:hype@localhost:5432/hype

npm run db:setup                # create schema
npm run db:seed                 # 12 LATAM cultural assets + 72h of history
npm run dev                     # http://localhost:3000
```

Then break it (you won't):

```powershell
npm run sim:pump                # 200 concurrent trades, live drift report
npm run sim:ambient             # gentle background flow for demos
npm run verify:math             # 200k-trade in-memory invariant proof
```

> Local Postgres runs transactions at `REPEATABLE READ` so it raises the same `40001` conflicts DSQL does — the demo behaves identically in both modes.

## Run it on Aurora DSQL (production / judging)

1. **AWS Console → Aurora DSQL → Create cluster** (e.g. `us-east-1`). Copy the endpoint: `xxxxxxxx.dsql.us-east-1.on.aws`.
2. Give your IAM identity the connect permission:
   ```json
   { "Effect": "Allow", "Action": "dsql:DbConnectAdmin", "Resource": "arn:aws:dsql:us-east-1:<account>:cluster/<cluster-id>" }
   ```
3. In `.env` (and later in Vercel → Project → Settings → Environment Variables):
   ```
   DSQL_ENDPOINT=xxxxxxxx.dsql.us-east-1.on.aws
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   DSQL_USER=admin
   SESSION_SECRET=<long random string>
   ```
   (Remove/comment `DATABASE_URL` — its presence selects local mode.)
4. `npm run db:setup && npm run db:seed` — the setup script automatically rewrites secondary indexes to `CREATE INDEX ASYNC` for DSQL.
5. Deploy: `vercel --prod` (or import the repo at vercel.com). Done — the same code path now mints IAM auth tokens per connection via `@aws-sdk/dsql-signer`.

## Million-scale notes (Track 3)

- **Reads** are cheap aggregates over indexed append-only data; every page is SWR-polled JSON that caches trivially at the edge.
- **Writes** are short single-row-set transactions; under OCC, throughput degrades gracefully into retries instead of collapsing into lock queues. The pump test sustains ~240 settlements/sec from a laptop against local PG with zero drift — DSQL's distributed commit takes the same code multi-region.
- **No coordination bottleneck**: no sequences, no FK cascades, no global locks — the schema was shaped so the only contention is the genuinely contended thing (the hot asset row), which is exactly what OCC retries are for.
- **Sessions** are stateless HMAC-signed cookies; no session store to scale.

## Honest limitations

- Bonding curve = always-liquid but path-deterministic pricing; no limit orders (yet).
- 24h change uses the trade tape as reference; a fresh database shows `—` until history accumulates.
- Play money. The point is the settlement engine, not securities law.
- Vercel preview cold starts add latency to the first request after idle.

## Roadmap

Listing/IPO flow for new assets (anyone can list a trend), per-region market hours as events, creator royalties from the treasury, WebSocket tape, and DSQL multi-region read affinity.

---

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind · SWR · `pg` · `@aws-sdk/dsql-signer` · Amazon Aurora DSQL · Vercel

**Author:** Juan Pablo Enríquez Ortiz ([@jpablortiz96](https://github.com/jpablortiz96)) — Cali, Colombia 🇨🇴

*Play money. Real database guarantees.*
