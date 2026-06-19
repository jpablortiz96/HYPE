# H0 Hackathon Submission - HYPE

## Title

HYPE - The Culture Exchange

## Short Description

A culture exchange for memes, sounds, creators, and trends, settled on Amazon Aurora
DSQL with a public Proof of Solvency that stays at drift 0 micro.

## Long Description

HYPE is a trading-style market for internet culture. Visitors get 10,000 play-money
$H instantly and trade cultural assets such as sounds, memes, AI trends, sports
moments, fashion signals, and creator narratives. Each asset uses a transparent
bonding curve: buying mints shares and raises the spot price; selling burns shares
and lowers the price.

The product thesis is that HYPE is not only a meme market. It is a monetization layer
for internet culture. The consumer market creates liquidity and behavioral signal.
HYPE Pro, sponsored IPOs, campaign missions, culture leagues, creator royalty
analytics, and scout reputation turn that signal into a future B2B business for
creators, agencies, brands, and trend researchers.

The technical thesis is that a market is only credible if the ledger cannot drift.
HYPE stores all money as BigInt micro-units and settles every trade as an ACID
transaction on Amazon Aurora DSQL. When concurrent trades hit the same hot asset,
Aurora DSQL detects optimistic-concurrency conflicts and the engine retries the
whole transaction from a fresh read. The public `/ledger` page recomputes the full
exchange equation from live data:

```txt
sum(user.cash) + sum(asset.reserve) === sum(user.granted)
asset.reserve === reserveAt(base, slope, supply)
```

The target result is exact: drift 0 micro, ledger balanced, curve consistent.

## Problem

Internet culture moves faster than brand budgets, research reports, and platform
analytics. Creators, labels, agencies, and brands want to know what is moving before
it becomes obvious. Fans and scouts already understand these signals, but there is
no market where attention can be discovered, priced, ranked, and eventually monetized.

## Audience

- Culture traders and fans who want to play a live market.
- Creators who want proof that their signal is moving.
- Agencies and brands looking for early cultural intelligence.
- Trend researchers who need a real-time behavioral dataset.
- Scouts who can identify momentum before mainstream adoption.

## Why Track 3: Million-Scale Global App

HYPE is designed for viral concurrency. During a cultural spike, many users trade the
same asset simultaneously. That creates exactly the hot-row write contention that
breaks weak demos: wallets, supplies, reserves, holdings, and trade tape entries all
need to stay consistent.

Aurora DSQL is the right fit because it provides:

- PostgreSQL-compatible ACID transactions.
- Strong snapshot isolation and optimistic concurrency control.
- Active-active architecture for global write patterns.
- Serverless operation.
- IAM authentication instead of static database passwords.

The app treats OCC conflicts as normal operation. Conflicts are retried with backoff
and jitter; prices are recomputed from fresh reads; non-retryable errors are not hidden.

## Live Links

- Live demo: https://hype-rust.vercel.app
- GitHub: https://github.com/jpablortiz96/hype
- Judges guide: `docs/JUDGES_START_HERE.md`
- Architecture: `docs/architecture.md`
- Demo script: `docs/demo-script.md`

## Product Walkthrough

1. Open `/` to see the culture exchange thesis.
2. Open `/market` to see the culture market board, filters, badges, volume, and sparklines.
3. Open `/asset/CORRIDO` to see the asset terminal, chart, trade desk, and Market Depth simulator.
4. Open `/ledger` to see live Proof of Solvency from Aurora DSQL.
5. Open `/list` to launch a Trend IPO or sponsored IPO simulation.
6. Open `/pro` to see the HYPE Pro Cultural Intelligence Terminal.
7. Open `/portfolio` to see Trend Scout Score.
8. Open `/campaigns` and `/leagues` to see monetization surfaces.

## Monetization Path

This is a path to a $100M-scale opportunity, not a claim that HYPE has current revenue
or valuation. Future monetization surfaces include:

- HYPE Pro subscriptions.
- Sponsored IPO placement.
- Brand Campaign Missions.
- Culture League sponsorships.
- Creator royalty analytics.
- Data/API licensing.
- Enterprise dashboards.
- Premium scout reputation marketplace.

## Technical Highlights

- Next.js App Router on Vercel.
- Amazon Aurora DSQL with IAM auth via `@aws-sdk/dsql-signer`.
- `pg` driver with local Postgres compatibility.
- Node.js API routes with `force-dynamic`.
- BigInt micro-unit settlement math.
- Linear bonding curve with exact reserve formula.
- OCC retry handling for `40001`, `40P01`, `OC000`, and DSQL change conflicts.
- Rollback before retry.
- Exponential backoff with jitter and cap.
- `CREATE INDEX ASYNC` for DSQL setup.
- Public `/ledger` proof.
- `npm run verify:math` for randomized invariant proof.
- `npm run sim:pump` for real concurrent trade pressure.

## Screenshots

| Requirement | File |
|---|---|
| Home | `docs/submission-assets/01-home.png` |
| Market board | `docs/submission-assets/02-market.png` |
| Asset terminal | `docs/submission-assets/03-asset-corrido.png` |
| Proof of Solvency | `docs/submission-assets/04-ledger-proof.png` |
| HYPE Pro | `docs/submission-assets/05-pro-analytics.png` |
| List a Trend | `docs/submission-assets/06-list-trend.png` |
| Campaigns | `docs/submission-assets/07-campaigns.png` |
| Leagues | `docs/submission-assets/08-leagues.png` |
| Aurora DSQL console | `docs/aws-console-dsql.png` |
| Concurrent pump terminal | `docs/submission-assets/05-sim-pump-dsql-terminal.png` |

Still optional before final submission:

- Add a Vercel dashboard screenshot if the form requests deployment evidence.
- Add the final public demo video URL.

## Judge Walkthrough Script

Use the live app and keep `/ledger` visible.

1. "HYPE is a culture exchange: play money, real database guarantees."
2. Show `/market` and explain cultural assets, volume, sponsored IPOs, and filters.
3. Open `/asset/CORRIDO`; show chart, trade panel, and Market Depth preview.
4. Show `/ledger`; point to drift 0 micro and curve consistency.
5. Mention `npm run sim:pump`: concurrent trades, OCC retries, invariant proof.
6. Show `/pro`, `/campaigns`, and `/leagues` as the monetization path.
7. Close with: "Play money. Real database guarantees. The ledger never lies."

## Next Steps

- Add paid HYPE Pro tiers.
- Add exportable trend intelligence reports.
- Add brand mission creation flow.
- Add scout reputation marketplace.
- Add regional DSQL deployment story and read-affinity strategy.
- Add more automated test coverage around trade settlement and listing.
