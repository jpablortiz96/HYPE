import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { microToFloat, spotPrice } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AssetRow {
  id: string; symbol: string; name: string; category: string; emoji: string; region: string;
  base_price: string; slope: string; supply: string; reserve: string;
}

export async function GET() {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600 * 1000);
  const sparkCutoff = new Date(now - 48 * 3600 * 1000);

  const assets = await q<AssetRow>(
    "SELECT id, symbol, name, category, emoji, region, base_price, slope, supply, reserve FROM assets ORDER BY reserve DESC"
  );
  const vols = await q<{ asset_id: string; vol: string; n: string }>(
    "SELECT asset_id, COALESCE(SUM(total),0)::text AS vol, COUNT(*)::text AS n FROM trades WHERE created_at > $1 GROUP BY asset_id",
    [dayAgo]
  );
  const refs = await q<{ asset_id: string; price: string; created_at: string }>(
    "SELECT asset_id, price, created_at FROM trades WHERE created_at <= $1 ORDER BY created_at ASC",
    [dayAgo]
  );
  const recent = await q<{ asset_id: string; price: string; created_at: string }>(
    "SELECT asset_id, price, created_at FROM trades WHERE created_at > $1 ORDER BY created_at ASC",
    [sparkCutoff]
  );

  const volBy = new Map(vols.map((v) => [v.asset_id, v]));
  const refBy = new Map<string, string>();
  for (const r of refs) refBy.set(r.asset_id, r.price); // last one wins = latest <= cutoff
  const sparkBy = new Map<string, number[]>();
  for (const r of recent) {
    const arr = sparkBy.get(r.asset_id) ?? [];
    arr.push(microToFloat(r.price));
    sparkBy.set(r.asset_id, arr);
  }

  const out = assets.map((a) => {
    const price = spotPrice(BigInt(a.base_price), BigInt(a.slope), BigInt(a.supply));
    const ref = refBy.get(a.id) ?? a.base_price;
    const refF = microToFloat(ref);
    const priceF = microToFloat(price);
    let spark = sparkBy.get(a.id) ?? [];
    if (spark.length > 40) {
      const step = spark.length / 40;
      spark = Array.from({ length: 40 }, (_, i) => spark[Math.floor(i * step)]);
    }
    spark.push(priceF);
    const v = volBy.get(a.id);
    return {
      symbol: a.symbol, name: a.name, category: a.category, emoji: a.emoji, region: a.region,
      price: priceF,
      change24h: refF > 0 ? ((priceF - refF) / refF) * 100 : null,
      volume24h: v ? microToFloat(v.vol) : 0,
      trades24h: v ? Number(v.n) : 0,
      supply: Number(a.supply),
      reserve: microToFloat(a.reserve),
      spark,
      raw: { base: a.base_price, slope: a.slope, supply: a.supply },
    };
  });

  return NextResponse.json({ assets: out, at: new Date().toISOString() });
}
