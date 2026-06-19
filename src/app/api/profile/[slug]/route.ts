import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { microToFloat, spotPrice } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  emoji: string;
  category: string;
  region: string;
  base_price: string;
  slope: string;
  supply: string;
  reserve: string;
  creator_handle: string | null;
  is_sponsored: boolean | null;
  sponsor_name: string | null;
  sponsor_type: string | null;
  campaign_note: string | null;
}

function slugify(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const target = slugify(slug);

  const assets = await q<AssetRow>(
    `SELECT id, symbol, name, emoji, category, region, base_price, slope, supply, reserve,
            creator_handle, is_sponsored, sponsor_name, sponsor_type, campaign_note
     FROM assets`
  );
  const totals = await q<{ asset_id: string; volume: string; trades: string; traders: string }>(
    `SELECT asset_id,
            COALESCE(SUM(total),0)::text AS volume,
            COUNT(*)::text AS trades,
            COUNT(DISTINCT user_id)::text AS traders
     FROM trades
     GROUP BY asset_id`
  );
  const totalBy = new Map(totals.map((t) => [t.asset_id, t]));

  const linked = assets.filter((a) => {
    const sponsorSlug = slugify(a.sponsor_name);
    const creatorSlug = slugify(a.creator_handle);
    return sponsorSlug === target || creatorSlug === target;
  });

  if (linked.length === 0) {
    return NextResponse.json({
      profile: {
        slug: target,
        name: slug.replace(/-/g, " "),
        type: "community",
        trendsLaunched: 0,
        sponsoredTrends: 0,
        totalCultureVolume: 0,
        estimatedCreatorRoyalties: 0,
        bestPerformingIpo: null,
        campaignReadinessScore: 0,
        linkedAssets: [],
      },
      empty: true,
      message: "No campaigns yet. Launch a cultural IPO to create the first signal.",
    });
  }

  const first = linked[0];
  const isSponsorProfile = linked.some((a) => slugify(a.sponsor_name) === target);
  const profileName = isSponsorProfile ? first.sponsor_name || target : first.creator_handle || target;
  const profileType = isSponsorProfile ? first.sponsor_type || "brand" : "creator";

  const linkedAssets = linked.map((a) => {
    const total = totalBy.get(a.id);
    const volume = BigInt(total?.volume ?? "0");
    const trades = Number(total?.trades ?? "0");
    const traders = Number(total?.traders ?? "0");
    const spot = spotPrice(BigInt(a.base_price), BigInt(a.slope), BigInt(a.supply));
    const base = BigInt(a.base_price);
    const performance = base > 0n ? ((microToFloat(spot) - microToFloat(base)) / microToFloat(base)) * 100 : 0;
    return {
      symbol: a.symbol,
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      region: a.region,
      isSponsored: a.is_sponsored === true,
      campaignNote: a.campaign_note,
      volume,
      trades,
      traders,
      performance,
    };
  });

  const totalVolume = linkedAssets.reduce((sum, a) => sum + a.volume, 0n);
  const sponsoredTrends = linkedAssets.filter((a) => a.isSponsored).length;
  const best = linkedAssets.slice().sort((a, b) => b.performance - a.performance)[0] ?? null;
  const activityScore = clamp(linkedAssets.reduce((sum, a) => sum + a.trades, 0) * 3);
  const volumeScore = clamp(Math.log10(Math.max(microToFloat(totalVolume), 1)) * 16);
  const readiness = Math.round(clamp(28 + sponsoredTrends * 12 + linkedAssets.length * 8 + activityScore * 0.2 + volumeScore * 0.35));

  return NextResponse.json({
    profile: {
      slug: target,
      name: profileName,
      type: profileType,
      trendsLaunched: linkedAssets.length,
      sponsoredTrends,
      totalCultureVolume: microToFloat(totalVolume),
      estimatedCreatorRoyalties: microToFloat(totalVolume / 100n),
      bestPerformingIpo: best && {
        symbol: best.symbol,
        name: best.name,
        emoji: best.emoji,
        performance: best.performance,
      },
      campaignReadinessScore: readiness,
      linkedAssets: linkedAssets.map((a) => ({
        symbol: a.symbol,
        name: a.name,
        emoji: a.emoji,
        category: a.category,
        region: a.region,
        isSponsored: a.isSponsored,
        campaignNote: a.campaignNote,
        volume: microToFloat(a.volume),
        trades: a.trades,
        traders: a.traders,
        performance: a.performance,
      })),
    },
    empty: false,
  });
}
