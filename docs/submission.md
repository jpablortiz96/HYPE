# H0 Hackathon — Submission package (copy/paste ready)

## Title
**HYPE — The Culture Exchange**

## Tagline (≤ 140 chars)
A planet-scale stock market for memes, sounds and trends — settled on Aurora DSQL, with a live Proof of Solvency that never drifts.

## Track
**Track 3: Million-scale** (architecture and concurrency story built for it). Secondary fit: Track 1 B2C.

## Elevator pitch (short description)
Culture already behaves like a market — HYPE makes it tradeable. Anyone gets 10,000 $H instantly (no signup) and trades cultural assets on transparent bonding curves. The hard part is the ledger: thousands of concurrent trades mutating the same hot rows. HYPE's settlement engine runs every trade as a strongly-consistent ACID transaction on **Amazon Aurora DSQL**, treats OCC conflicts (SQLSTATE 40001) as normal operation with automatic retry, and proves the result in public: a live audit page recomputes `Σ user cash + Σ curve reserves = Σ minted` every 2 seconds — and the drift is **0 micro-units, exactly**, even while a stress script fires hundreds of concurrent trades at it.

## Full description

**The problem & who it's for.** Internet culture moves billions in attention but there's no venue to take a position on it. HYPE is a B2C game-market for culture fans (starting with LATAM: corridos, cumbia, capybaras, telenovela-core) — and underneath, a serious demonstration of how to build an exchange-grade ledger on the zero stack.

**How it works.** Each asset trades on a linear bonding curve `P(s) = base + slope·s`. Buying mints shares (price rises), selling burns them (price falls); the curve itself is the always-available market maker. A disclosed 1% sell fee routes to the treasury — the monetization line. All money is integer micro-units (BigInt end to end), so the two solvency invariants hold exactly, not within epsilon.

**Why Aurora DSQL — deliberately.** An exchange needs: (1) atomic multi-row settlement; (2) correctness under write contention on hot rows; (3) global active-active writes; (4) elasticity for viral spikes. DSQL provides all four natively: PostgreSQL-compatible ACID transactions, strong snapshot isolation with optimistic concurrency control, multi-region active-active, serverless scaling, IAM auth. The schema is shaped for DSQL: no sequences (app-minted UUIDs), no FKs (integrity enforced by the settlement transaction), composite PK on holdings so concurrent first-buys resolve through the OCC retry path, `CREATE INDEX ASYNC` for secondary indexes. The engine recomputes prices from a fresh read on every retry, so contention can never settle a trade at a stale price.

**The demo that matters.** `npm run sim:pump` fires 200 concurrent trades from 24 bots (~240 tx/s in testing, 55 OCC conflicts retried) while the public `/ledger` page re-audits the whole exchange every 2 seconds. Drift: 0 micro. Every time.

**Built with:** Next.js 15, React 19, TypeScript, Tailwind, SWR, node-postgres, @aws-sdk/dsql-signer, Amazon Aurora DSQL, Vercel.

## Submission checklist

- [ ] Public repo URL: `https://github.com/jpablortiz96/hype`
- [ ] Live deployment URL (Vercel): `https://hype-<your-slug>.vercel.app`
- [ ] Vercel Team ID: *(Vercel dashboard → Settings → General → Team ID)*
- [ ] Demo video ≤ 3 min (script: `docs/demo-script.md`) — uploaded to YouTube, public
- [ ] Architecture diagram: `docs/architecture.svg` (export PNG if the form requires)
- [ ] **Screenshot of AWS Console showing the Aurora DSQL cluster** (take it on the cluster detail page, region visible)
- [ ] Env vars set in Vercel: `DSQL_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DSQL_USER`, `SESSION_SECRET`

## Bonus content post (publish with #H0Hackathon)

> Idea for LinkedIn/X (ES or EN): a 60–90s clip of the split screen — `sim:pump` flooding the engine on the right, the Proof of Solvency equation staying green at drift 0 on the left. Caption draft:
>
> "Construí una bolsa de valores para la cultura de internet 🇨🇴📈 — y la parte difícil no fue el juego, fue el ledger. 200 trades concurrentes, 55 conflictos de concurrencia reintentados, drift: 0 micro-unidades. Amazon Aurora DSQL + Vercel. El ledger nunca miente. Created for the purposes of entering the #H0Hackathon."
>
> (Keep the literal sentence "Created for the purposes of entering this hackathon" or the hashtag variant — the rules require disclosure on bonus content.)
