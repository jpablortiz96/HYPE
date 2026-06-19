import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { microToFloat, spotPrice } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const rows = await q(
    "SELECT id, symbol, name, category, emoji, region, base_price, slope, supply, reserve, created_at FROM assets WHERE symbol = $1",
    [symbol.toUpperCase()]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Unknown symbol." }, { status: 404 });
  const a = rows[0];

  const trades = await q<{ side: string; qty: string; price: string; total: string; created_at: string }>(
    "SELECT side, qty, price, total, created_at FROM trades WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 200",
    [a.id]
  );

  let position: { qty: number; costBasis: number } | null = null;
  const user = await getSessionUser();
  if (user) {
    const h = await q("SELECT qty, cost_basis FROM holdings WHERE user_id = $1 AND asset_id = $2", [user.id, a.id]);
    if (h.length) position = { qty: Number(h[0].qty), costBasis: microToFloat(h[0].cost_basis) };
  }

  const price = spotPrice(BigInt(a.base_price), BigInt(a.slope), BigInt(a.supply));
  const series = trades
    .slice()
    .reverse()
    .map((t) => ({ t: t.created_at, p: microToFloat(t.price) }));
  series.push({ t: new Date().toISOString(), p: microToFloat(price) });

  return NextResponse.json({
    asset: {
      symbol: a.symbol, name: a.name, category: a.category, emoji: a.emoji, region: a.region,
      price: microToFloat(price),
      supply: Number(a.supply),
      reserve: microToFloat(a.reserve),
      basePrice: microToFloat(a.base_price),
      raw: { base: a.base_price, slope: a.slope, supply: a.supply },
    },
    series,
    recentTrades: trades.slice(0, 24).map((t) => ({
      side: t.side, qty: Number(t.qty), price: microToFloat(t.price), total: microToFloat(t.total), at: t.created_at,
    })),
    position,
  });
}
