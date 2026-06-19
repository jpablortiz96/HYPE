import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { microToFloat, spotPrice } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  category: string;
  emoji: string;
  region: string;
  base_price: string;
  slope: string;
  supply: string;
  reserve: string;
  is_sponsored: boolean | null;
  sponsor_name: string | null;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function compareMicroDesc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

export async function GET() {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600 * 1000);

  const assets = await q<AssetRow>(
    `SELECT id, symbol, name, category, emoji, region, base_price, slope, supply, reserve,
            is_sponsored, sponsor_name
     FROM assets`
  );
  const totals = await q<{ volume: string; trades: string }>(
    "SELECT COALESCE(SUM(total),0)::text AS volume, COUNT(*)::text AS trades FROM trades"
  );
  const totalsByAsset = await q<{ asset_id: string; volume: string; trades: string }>(
    "SELECT asset_id, COALESCE(SUM(total),0)::text AS volume, COUNT(*)::text AS trades FROM trades GROUP BY asset_id"
  );
  const vols24 = await q<{ asset_id: string; volume: string; trades: string }>(
    "SELECT asset_id, COALESCE(SUM(total),0)::text AS volume, COUNT(*)::text AS trades FROM trades WHERE created_at > $1 GROUP BY asset_id",
    [dayAgo]
  );
  const refs = await q<{ asset_id: string; price: string }>(
    "SELECT asset_id, price FROM trades WHERE created_at <= $1 ORDER BY created_at ASC",
    [dayAgo]
  );
  const recent = await q<{ asset_id: string; price: string }>(
    "SELECT asset_id, price FROM trades WHERE created_at > $1 ORDER BY created_at ASC",
    [dayAgo]
  );

  const totalVolume = BigInt(totals[0]?.volume ?? "0");
  const totalTrades = Number(totals[0]?.trades ?? "0");
  const totalBy = new Map(totalsByAsset.map((v) => [v.asset_id, v]));
  const volBy = new Map(vols24.map((v) => [v.asset_id, v]));
  const refBy = new Map<string, string>();
  for (const r of refs) refBy.set(r.asset_id, r.price);

  const pricesBy = new Map<string, bigint[]>();
  for (const r of recent) {
    const arr = pricesBy.get(r.asset_id) ?? [];
    arr.push(BigInt(r.price));
    pricesBy.set(r.asset_id, arr);
  }

  const ranked = assets.map((a) => {
    const base = BigInt(a.base_price);
    const slope = BigInt(a.slope);
    const supply = BigInt(a.supply);
    const price = spotPrice(base, slope, supply);
    const ref = BigInt(refBy.get(a.id) ?? a.base_price);
    const change24h = ref > 0n ? ((microToFloat(price) - microToFloat(ref)) / microToFloat(ref)) * 100 : 0;
    const v = volBy.get(a.id);
    const volume24h = BigInt(v?.volume ?? "0");
    const trades24h = Number(v?.trades ?? "0");
    const observed = [...(pricesBy.get(a.id) ?? []), price];
    let volatility = 0;
    if (observed.length > 1) {
      let min = observed[0];
      let max = observed[0];
      for (const p of observed) {
        if (p < min) min = p;
        if (p > max) max = p;
      }
      volatility = min > 0n ? ((microToFloat(max) - microToFloat(min)) / microToFloat(min)) * 100 : 0;
    }
    return {
      symbol: a.symbol,
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      region: a.region,
      price,
      change24h,
      volume24h,
      trades24h,
      volatility,
      isSponsored: a.is_sponsored === true,
      sponsorName: a.sponsor_name,
      totalVolume: BigInt(totalBy.get(a.id)?.volume ?? "0"),
    };
  });

  const topMomentum = ranked.slice().sort((a, b) => b.change24h - a.change24h)[0] ?? null;
  const highestVolume = ranked.slice().sort((a, b) => compareMicroDesc(a.volume24h, b.volume24h))[0] ?? null;
  const mostVolatile = ranked.slice().sort((a, b) => b.volatility - a.volatility)[0] ?? null;

  const activeAssets = ranked.filter((a) => a.trades24h > 0).length;
  const avgMomentum =
    ranked.length > 0 ? ranked.reduce((sum, a) => sum + Math.max(0, a.change24h), 0) / ranked.length : 0;
  const activityScore = clamp((totalTrades / Math.max(assets.length, 1)) * 2.5);
  const breadthScore = clamp((activeAssets / Math.max(assets.length, 1)) * 100);
  const momentumScore = clamp(avgMomentum * 3);
  const liquidityScore = clamp(Math.log10(Math.max(microToFloat(totalVolume), 1)) * 16);
  const sponsoredAssets = ranked.filter((a) => a.isSponsored);
  const topSponsored = sponsoredAssets.slice().sort((a, b) => compareMicroDesc(a.totalVolume, b.totalVolume))[0] ?? null;
  const estimatedCreatorRoyalties = totalVolume / 100n;
  const brandOpportunityScore = Math.round(
    clamp(35 + sponsoredAssets.length * 8 + liquidityScore * 0.25 + breadthScore * 0.2 + momentumScore * 0.15)
  );

  return NextResponse.json({
    metrics: {
      marketVolume: microToFloat(totalVolume),
      listedTrends: assets.length,
      totalTrades,
      topMomentum: topMomentum && {
        symbol: topMomentum.symbol,
        name: topMomentum.name,
        emoji: topMomentum.emoji,
        change24h: topMomentum.change24h,
      },
      highest24hVolume: highestVolume && {
        symbol: highestVolume.symbol,
        name: highestVolume.name,
        emoji: highestVolume.emoji,
        volume24h: microToFloat(highestVolume.volume24h),
      },
      mostVolatile: mostVolatile && {
        symbol: mostVolatile.symbol,
        name: mostVolatile.name,
        emoji: mostVolatile.emoji,
        volatility: mostVolatile.volatility,
      },
    },
    scores: {
      cultureOpportunity: Math.round(clamp(30 + breadthScore * 0.25 + momentumScore * 0.25 + liquidityScore * 0.2)),
      brandReadiness: Math.round(clamp(35 + liquidityScore * 0.35 + activityScore * 0.2 + breadthScore * 0.15)),
      creatorMonetization: Math.round(clamp(32 + momentumScore * 0.3 + activityScore * 0.25 + breadthScore * 0.15)),
    },
    monetization: {
      sponsoredTrendsCount: sponsoredAssets.length,
      estimatedCreatorRoyalties: microToFloat(estimatedCreatorRoyalties),
      totalCultureVolume: microToFloat(totalVolume),
      brandOpportunityScore,
      topSponsoredAsset: topSponsored && {
        symbol: topSponsored.symbol,
        name: topSponsored.name,
        emoji: topSponsored.emoji,
        sponsorName: topSponsored.sponsorName,
        totalVolume: microToFloat(topSponsored.totalVolume),
      },
    },
    at: new Date().toISOString(),
  });
}
