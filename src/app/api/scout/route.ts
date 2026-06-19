import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { microToFloat, sellFee, sellProceeds, spotPrice } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TradeRow {
  asset_id: string;
  side: string;
  price: string;
  symbol: string;
  name: string;
  emoji: string;
  base_price: string;
  slope: string;
  supply: string;
}

interface HoldingRow {
  qty: string;
  cost_basis: string;
  symbol: string;
  name: string;
  emoji: string;
  base_price: string;
  slope: string;
  supply: string;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function labelFor(score: number): string {
  if (score >= 85) return "Viral Oracle";
  if (score >= 70) return "Alpha Scout";
  if (score >= 55) return "Momentum Hunter";
  if (score >= 35) return "Culture Trader";
  return "Rookie Scout";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({
      score: 0,
      label: "Rookie Scout",
      earlyEntries: 0,
      trendsTraded: 0,
      portfolioMomentum: 0,
      bestPosition: null,
      tradeCount: 0,
    });
  }

  const trades = await q<TradeRow>(
    `SELECT t.asset_id, t.side, t.price, a.symbol, a.name, a.emoji, a.base_price, a.slope, a.supply
     FROM trades t
     JOIN assets a ON a.id = t.asset_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC
     LIMIT 500`,
    [user.id]
  );
  const holdings = await q<HoldingRow>(
    `SELECT h.qty, h.cost_basis, a.symbol, a.name, a.emoji, a.base_price, a.slope, a.supply
     FROM holdings h
     JOIN assets a ON a.id = h.asset_id
     WHERE h.user_id = $1`,
    [user.id]
  );

  const tradedAssets = new Set(trades.map((t) => t.asset_id));
  const earlyEntries = trades.filter((t) => {
    if (t.side !== "BUY") return false;
    const current = spotPrice(BigInt(t.base_price), BigInt(t.slope), BigInt(t.supply));
    return BigInt(t.price) <= (current * 80n) / 100n;
  }).length;

  let bestPosition: null | {
    symbol: string;
    name: string;
    emoji: string;
    pnlPct: number;
    pnl: number;
  } = null;
  let totalBasis = 0n;
  let totalPnl = 0n;

  for (const h of holdings) {
    const base = BigInt(h.base_price);
    const slope = BigInt(h.slope);
    const supply = BigInt(h.supply);
    const qty = BigInt(h.qty);
    const basis = BigInt(h.cost_basis);
    const gross = sellProceeds(base, slope, supply, qty);
    const exitNet = gross - sellFee(gross);
    const pnl = exitNet - basis;
    const pnlPct = basis > 0n ? (microToFloat(pnl) / microToFloat(basis)) * 100 : 0;

    totalBasis += basis;
    totalPnl += pnl;

    if (!bestPosition || pnlPct > bestPosition.pnlPct) {
      bestPosition = {
        symbol: h.symbol,
        name: h.name,
        emoji: h.emoji,
        pnlPct,
        pnl: microToFloat(pnl),
      };
    }
  }

  const portfolioMomentum =
    totalBasis > 0n ? (microToFloat(totalPnl) / microToFloat(totalBasis)) * 100 : 0;

  const tradeDepthScore = clamp(trades.length * 3, 0, 25);
  const breadthScore = clamp(tradedAssets.size * 8, 0, 25);
  const earlyScore = clamp(earlyEntries * 6, 0, 20);
  const performanceScore = clamp(Math.max(0, bestPosition?.pnlPct ?? 0) * 0.3, 0, 15);
  const momentumScore = clamp(Math.max(0, portfolioMomentum) * 0.3, 0, 15);
  const score = Math.round(
    clamp(tradeDepthScore + breadthScore + earlyScore + performanceScore + momentumScore)
  );

  return NextResponse.json({
    score,
    label: labelFor(score),
    earlyEntries,
    trendsTraded: tradedAssets.size,
    portfolioMomentum,
    bestPosition,
    tradeCount: trades.length,
  });
}
