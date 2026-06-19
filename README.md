# HYPE - The Culture Exchange

**Play money. Real database guarantees. Internet culture finally has a market.**

HYPE is a trading-style culture exchange for memes, sounds, creators, sports moments,
fashion signals, AI trends, and internet-native cultural assets. It is built for the
**H0 Hackathon - Hack the Zero Stack**, Track 3: Million-scale Global App, using
**Vercel + Amazon Aurora DSQL** as the trust layer.

[Live demo](https://hype-rust.vercel.app) | [Judges start here](docs/JUDGES_START_HERE.md) | [Architecture](docs/architecture.md) | [Submission notes](docs/submission.md) | [Demo script](docs/demo-script.md)

![H0 Hackathon](https://img.shields.io/badge/H0%20Hackathon-Track%203%20Million--scale-ffb300?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-Next.js%20App%20Router-black?style=flat-square)
![Aurora DSQL](https://img.shields.io/badge/Amazon%20Aurora%20DSQL-ACID%20ledger-2ce08b?style=flat-square)
![Proof of Solvency](https://img.shields.io/badge/Proof%20of%20Solvency-drift%200%20micro-2ce08b?style=flat-square)

> Video placeholder: add the final public demo video URL here before submission.

## The Problem

Internet culture already behaves like a market. A sound breaks out, a meme peaks,
a fashion signal jumps from niche to mainstream, a creator moment becomes a global
reference. Attention moves billions of dollars in commerce, media, and brand spend,
but there is no shared market surface for discovering, pricing, and monetizing
cultural momentum.

Most trend products are dashboards after the fact. HYPE makes cultural signals
tradeable in real time.

## The Solution

HYPE gives every visitor 10,000 play-money $H and lets them trade cultural assets
on transparent bonding curves. Buying mints shares and moves the price up. Selling
burns shares and moves the price down. The market is always liquid, the pricing rule
is public, and the ledger is auditable.

The product is not only a meme market. **HYPE is the monetization layer for internet
culture.**

Core surfaces:

- **Culture market board** with prices, volume, change, badges, filters, and mini sparklines.
- **Asset terminals** with a trading-style chart, live trade desk, and market metrics.
- **Buy/sell play money** through a transaction engine that settles on Aurora DSQL.
- **Market Depth / Slippage Simulator** that previews buy impact without writing to the DB.
- **Proof of Solvency** at `/ledger`, recomputing the exchange invariants from live data.
- **HYPE Pro analytics** at `/pro`, a B2B cultural intelligence terminal.
- **Trend Scout Score** in `/portfolio`, turning user behavior into a future reputation layer.
- **Trend IPO / List a Trend** at `/list`, including sponsored IPO simulation.
- **Brand Campaign Missions** at `/campaigns`.
- **Culture Leagues** at `/leagues`.
- **Creator/Brand profiles**, leaderboard, and portfolio.

## Why This Has A Path To A $100M-Scale Opportunity

HYPE is a venture-scale thesis, not a claim of current revenue, valuation, or users.
The path is the combination of consumer liquidity, cultural data, and B2B monetization:

- **HYPE Pro subscriptions** for creators, agencies, brands, and trend researchers.
- **Sponsored IPOs** where creators or brands promote new cultural assets.
- **Brand Campaign Missions** that convert trend attention into measurable briefs.
- **Culture Leagues** for sponsored scout competitions and brand-funded prizes.
- **Creator royalty analytics** and revenue simulations over cultural volume.
- **Data/API licensing** for agencies, platforms, labels, and research teams.
- **Premium scout reputation marketplace** where top scouts sell cultural insight.
- **Enterprise dashboards** for brand readiness, creator discovery, and market timing.

The wedge is LATAM-first internet culture. The expansion path is global: music,
fashion, sports, AI-native media, creator economies, gaming, and brand research.

## Why The H0 Stack Matters

The hard part is not drawing a market UI. The hard part is settlement.

A culture exchange has hot rows: wallets, asset supplies, reserves, and holdings.
During a viral spike, many trades hit the same asset at the same time. HYPE uses
Amazon Aurora DSQL as the database trust boundary:

- Every trade is an ACID transaction.
- Aurora DSQL uses optimistic concurrency control; real conflicts abort instead of
  silently corrupting the curve.
- `withTx()` retries retryable conflicts (`40001`, `40P01`, `OC000`, and DSQL change
  conflict messages) with exponential backoff and jitter.
- Prices are recomputed from a fresh read on every retry.
- The public ledger proves the result from the database, not from cached app state.

Local Postgres remains compatible. HYPE deliberately keeps the transaction difference:

```ts
isDsql() ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ"
```

DSQL already provides strong snapshot isolation. Local Postgres is raised to
`REPEATABLE READ` so the same conflict behavior appears in development.

## The Ledger Guarantee

All money is represented as **BigInt micro-units**:

```txt
1 $H = 1,000,000 micro-units
```

No floats are used for internal money math. Shares are whole integers. The bonding
curve is linear and discrete:

```txt
spotPrice(s) = base + slope * s
buyCost(q)  = q * base + slope * (s * q + q * (q - 1) / 2)
reserve(s)  = s * base + slope * s * (s - 1) / 2
```

Two invariants are sacred:

```txt
sum(user.cash) + sum(asset.reserve) === sum(user.granted)
asset.reserve === reserveAt(base, slope, supply)
```

`/ledger` recomputes both from live database state. The target result is:

```txt
drift 0 micro
ledger balanced YES - EXACT
curve consistent YES
```

The stress command `npm run sim:pump` fires concurrent trades against the real
database and reports OCC retries plus final invariant status.

## Technical Implementation

- **Next.js App Router**, React, TypeScript, Tailwind.
- **Vercel** for deployment and serverless API routes.
- **Amazon Aurora DSQL** for production persistence.
- **PostgreSQL local mode** for development.
- **node-postgres (`pg`)** as the driver.
- **`@aws-sdk/dsql-signer`** for IAM database auth tokens.
- **BigInt + micro-units** for all settlement math.
- **Node.js API routes** with `force-dynamic`.
- **Aurora DSQL OCC retries** with rollback safety, exponential backoff, jitter, and
  retry statistics surfaced to the trade result.
- **`CREATE INDEX ASYNC`** when setting up schema against DSQL.
- **No float accounting** in the engine.

Schema choices made for Aurora DSQL:

- UUIDs minted in the app, not sequences.
- No foreign keys; integrity is enforced by the settlement transaction.
- Composite holdings key: `(user_id, asset_id)`.
- `users.granted` records every $H minted to a user, making solvency a direct aggregate.
- Stored reserves are checked against the closed-form curve.

## Architecture

```mermaid
flowchart LR
  Browser["Browser\nMarket, Asset, Portfolio, Pro, Ledger"] --> Vercel["Vercel\nNext.js App Router + API routes"]
  Vercel --> Session["HMAC session cookie\nstateless guest account"]
  Vercel --> Trade["Trade engine\nBigInt curve math\nOCC retry"]
  Vercel --> ReadAPIs["Read APIs\nmarket, asset, pro, scout,\ncampaigns, leagues, profiles"]
  Trade --> DSQL[("Amazon Aurora DSQL\nACID transactions\nOCC conflicts\nIAM auth")]
  ReadAPIs --> DSQL
  Vercel --> Ledger["Integrity engine\nProof of Solvency"]
  Ledger --> DSQL
```

Full architecture notes: [docs/architecture.md](docs/architecture.md) and
[docs/architecture.svg](docs/architecture.svg).

## Screenshots

### Product surfaces

<table>
  <tr>
    <td width="50%">
      <strong>Home</strong><br />
      <img src="docs/submission-assets/01-home.png" alt="HYPE home" width="100%" />
    </td>
    <td width="50%">
      <strong>Market board</strong><br />
      <img src="docs/submission-assets/02-market.png" alt="HYPE market board" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>Asset terminal / CORRIDO</strong><br />
      <img src="docs/submission-assets/03-asset-corrido.png" alt="HYPE asset terminal" width="100%" />
    </td>
    <td width="50%">
      <strong>Proof of Solvency</strong><br />
      <img src="docs/submission-assets/04-ledger-proof.png" alt="HYPE proof of solvency ledger" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>HYPE Pro</strong><br />
      <img src="docs/submission-assets/05-pro-analytics.png" alt="HYPE Pro analytics" width="100%" />
    </td>
    <td width="50%">
      <strong>List a Trend</strong><br />
      <img src="docs/submission-assets/06-list-trend.png" alt="HYPE list a trend" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>Campaigns</strong><br />
      <img src="docs/submission-assets/07-campaigns.png" alt="HYPE campaigns" width="100%" />
    </td>
    <td width="50%">
      <strong>Leagues</strong><br />
      <img src="docs/submission-assets/08-leagues.png" alt="HYPE leagues" width="100%" />
    </td>
  </tr>
</table>

### Technical proof

<table>
  <tr>
    <td width="50%">
      <strong>Aurora DSQL console</strong><br />
      <img src="docs/aws-console-dsql.png" alt="Aurora DSQL cluster proof" width="100%" />
    </td>
    <td width="50%">
      <strong>sim:pump terminal</strong><br />
      <img src="docs/submission-assets/05-sim-pump-dsql-terminal.png" alt="sim pump proof" width="100%" />
    </td>
  </tr>
</table>

Vercel dashboard screenshot is intentionally not included in the repo yet. Add it to
`docs/submission-assets/` if the submission form asks for deployment proof.

## Run Locally

```powershell
git clone https://github.com/jpablortiz96/hype.git
cd hype
npm install
copy .env.example .env

docker compose up -d
# In .env, use DATABASE_URL=postgresql://hype:hype@localhost:5432/hype

npm run db:setup
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Verification Commands

```powershell
npm run build
npm run verify:math
npm run sim:pump
```

`db:seed` wipes and reseeds demo data. Do not run it against production unless you
intentionally want to reset the demo database.

## Production / Judging

- Live app: https://hype-rust.vercel.app
- Repo owner: `jpablortiz96`
- Project: `HYPE - The Culture Exchange`
- Track: H0 Hackathon Track 3, Million-scale Global App
- Database: Amazon Aurora DSQL
- Key proof route: `/ledger`
- Main walkthrough route: `/market` -> `/asset/CORRIDO` -> `/ledger` -> `/pro`

## Honest Limits

- HYPE uses play money; it is not a securities product.
- Payment flows are not implemented. Sponsored IPOs, campaigns, prizes, and royalty
  surfaces are product simulations over live market data.
- The current market maker is a deterministic bonding curve, not a full order book.
- Some analytics are intentionally simple and robust for the hackathon build.

## Author

Juan Pablo Enriquez Ortiz ([@jpablortiz96](https://github.com/jpablortiz96))

Built for the H0 Hackathon with Vercel and Amazon Aurora DSQL.

**Play money. Real database guarantees. The ledger never lies.**
