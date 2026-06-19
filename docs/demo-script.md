# HYPE Demo Video Script - under 3 minutes

Goal: show the product, the monetization thesis, and why Aurora DSQL matters. Keep the
video fast and concrete.

## Setup Before Recording

- Open the live app: https://hype-rust.vercel.app
- Keep tabs ready: `/`, `/market`, `/asset/CORRIDO`, `/ledger`, `/list`, `/pro`,
  `/campaigns`, `/leagues`.
- Keep a terminal ready with `npm run sim:pump`.
- Optional: show `docs/architecture.svg` and the AWS Aurora DSQL console screenshot.

## 0:00 - 0:20 - Problem

Screen: home page.

Voiceover:

> Internet culture already behaves like a market. A sound breaks out, a meme peaks,
> a fashion signal jumps from niche to mainstream, and brands spend real money trying
> to understand it too late. HYPE makes that market visible and tradeable.

## 0:20 - 0:45 - Product

Screen: `/market`.

Voiceover:

> This is HYPE: The Culture Exchange. Every visitor gets 10,000 play-money $H. The
> board shows cultural assets, live prices, 24-hour movement, volume, sponsored IPOs,
> filters, badges, and sparklines. It feels like an exchange, but the asset class is
> internet culture.

## 0:45 - 1:15 - Asset Terminal And Trade

Screen: `/asset/CORRIDO`.

Voiceover:

> Each asset trades on a transparent bonding curve. Buying mints shares and moves the
> price up. Selling burns shares and moves it down. The trade panel previews curve
> cost, average fill, and projected spot. The Market Depth simulator shows slippage
> before you trade, and it is preview-only: no database write, no hidden order route.

Optional action: buy a small quantity if you want a live fill.

## 1:15 - 1:45 - Proof Of Solvency

Screen: `/ledger`.

Voiceover:

> The real demo is the ledger. HYPE stores money as BigInt micro-units, not floats.
> This page recomputes the whole exchange from Aurora DSQL every few seconds. User
> cash plus curve reserves must equal every $H ever minted, and each reserve must
> match the bonding curve formula. The result is exact: drift 0 micro.

## 1:45 - 2:10 - Concurrency Test

Screen: split terminal and `/ledger`. Run `npm run sim:pump`.

Voiceover:

> Now we try to break it. This script fires concurrent trades from bots against the
> real database. Aurora DSQL detects optimistic-concurrency conflicts on hot rows.
> The engine rolls back, waits with jitter, retries from a fresh read, and recomputes
> the price. Conflicts are expected; ledger drift is not.

Point at the terminal lines for OCC retries, drift 0 micro, ledger balanced, and curve
consistent.

## 2:10 - 2:35 - Monetization Layer

Screen: `/list`, then `/pro`.

Voiceover:

> HYPE is not only a meme market. It is the monetization layer for internet culture.
> Creators and brands can launch Trend IPOs and sponsored cultural markets. HYPE Pro
> turns the trading behavior into cultural intelligence: momentum, 24-hour volume,
> volatility, brand readiness, creator monetization potential, and opportunity scores.

## 2:35 - 2:50 - Campaigns And Leagues

Screen: `/campaigns`, then `/leagues`.

Voiceover:

> The future business is B2B: sponsored IPOs, brand campaign missions, scout leagues,
> creator royalty analytics, and data products for agencies, brands, creators, and
> trend researchers.

## 2:50 - 3:00 - Close

Screen: `/ledger` green.

Voiceover:

> HYPE: The Culture Exchange. Play money. Real database guarantees. The ledger never
> lies.

## Required Visual Proof Checklist

- Home page.
- Market board.
- Asset terminal with CORRIDO.
- Market Depth.
- Proof of Solvency at drift 0 micro.
- Terminal running `npm run sim:pump`.
- HYPE Pro.
- AWS Aurora DSQL console or architecture diagram.
