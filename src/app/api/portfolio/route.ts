import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { q } from "@/lib/db";
import { microToFloat, spotPrice, sellProceeds, sellFee } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getOrCreateUser();
  const rows = await q<{
    qty: string; cost_basis: string;
    symbol: string; name: string; emoji: string; category: string;
    base_price: string; slope: string; supply: string;
  }>(
    `SELECT h.qty, h.cost_basis, a.symbol, a.name, a.emoji, a.category, a.base_price, a.slope, a.supply
     FROM holdings h JOIN assets a ON a.id = h.asset_id
     WHERE h.user_id = $1 ORDER BY h.cost_basis DESC`,
    [user.id]
  );

  const positions = rows.map((r) => {
    const base = BigInt(r.base_price), slope = BigInt(r.slope), supply = BigInt(r.supply), qty = BigInt(r.qty);
    const spot = spotPrice(base, slope, supply);
    const exitGross = sellProceeds(base, slope, supply, qty);
    const exitNet = exitGross - sellFee(exitGross);
    const basis = BigInt(r.cost_basis);
    return {
      symbol: r.symbol, name: r.name, emoji: r.emoji, category: r.category,
      qty: Number(r.qty),
      avgCost: microToFloat(basis / qty),
      spot: microToFloat(spot),
      value: microToFloat(exitNet),
      pnl: microToFloat(exitNet - basis),
      pnlPct: Number(basis) > 0 ? (Number(exitNet - basis) / Number(basis)) * 100 : 0,
    };
  });

  const holdingsValue = positions.reduce((s, p) => s + p.value, 0);
  const cash = microToFloat(user.cash);

  return NextResponse.json({
    user: { username: user.username },
    cash,
    holdingsValue,
    netWorth: cash + holdingsValue,
    startingCash: 10_000,
    positions,
  });
}
