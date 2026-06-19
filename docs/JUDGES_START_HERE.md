# Judges Start Here

## Project

**HYPE - The Culture Exchange**

HYPE is a culture exchange for memes, sounds, creators, and trends. It uses play
money, but the database guarantees are real: settlement runs on Amazon Aurora DSQL,
and `/ledger` publicly proves the exchange is solvent to the micro-unit.

## Links

- Live app: https://hype-rust.vercel.app
- GitHub: https://github.com/jpablortiz96/hype
- Track: H0 Hackathon Track 3 - Million-scale Global App
- Database: Amazon Aurora DSQL
- Main proof: https://hype-rust.vercel.app/ledger

## Fast Walkthrough

1. Open `/market`.
   - See the culture market board, filters, badges, sponsored IPOs, prices, volume,
     and sparklines.
2. Open `/asset/CORRIDO`.
   - See the trading-style chart, trade panel, and Market Depth / Slippage Simulator.
3. Open `/ledger`.
   - Confirm `drift 0 micro` and curve consistency from live database state.
4. Open `/list`.
   - See the Trend IPO and sponsored IPO launch surface.
5. Open `/pro`.
   - See the HYPE Pro Cultural Intelligence Terminal.
6. Open `/campaigns` and `/leagues`.
   - See future monetization surfaces for brands, creators, agencies, and scouts.
7. Open `/portfolio`.
   - See Trend Scout Score and scout monetization narrative.

## Proof Screenshots

- Home: `docs/submission-assets/01-home.png`
- Market: `docs/submission-assets/02-market.png`
- CORRIDO asset terminal: `docs/submission-assets/03-asset-corrido.png`
- Proof of Solvency: `docs/submission-assets/04-ledger-proof.png`
- HYPE Pro: `docs/submission-assets/05-pro-analytics.png`
- List a Trend: `docs/submission-assets/06-list-trend.png`
- Campaigns: `docs/submission-assets/07-campaigns.png`
- Leagues: `docs/submission-assets/08-leagues.png`
- Aurora DSQL console: `docs/aws-console-dsql.png`
- `sim:pump` terminal: `docs/submission-assets/05-sim-pump-dsql-terminal.png`

## Commands

Use these commands for local verification:

```powershell
npm run build
npm run verify:math
npm run sim:pump
```

Expected invariant result:

```txt
drift 0 micro
ledger balanced YES - EXACT
curve consistent YES
```

`npm run db:seed` resets demo data. Do not run it against production unless a reset is
intentional.

## What Makes It A Database Project

HYPE is not a static dashboard. The hard requirement is concurrent settlement:

- Trades move user cash, asset reserve, supply, holdings, and append-only trade tape.
- All money is BigInt micro-units.
- Aurora DSQL detects optimistic-concurrency conflicts.
- The engine retries retryable conflicts from a fresh read.
- `/ledger` recomputes solvency from live rows.

The product can add analytics, campaigns, and leagues because the ledger underneath
does not drift.
