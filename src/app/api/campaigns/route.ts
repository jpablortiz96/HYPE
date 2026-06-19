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
  is_sponsored: boolean | null;
  sponsor_name: string | null;
  sponsor_type: string | null;
  campaign_note: string | null;
  creator_handle: string | null;
}

const MISSION_TYPES = [
  "Launch Challenge",
  "Meme War",
  "Creator Push",
  "Brand Signal",
  "World Cup Trend",
  "AI Trend Hunt",
];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function statusFor(progress: number): string {
  if (progress >= 100) return "Completed";
  if (progress >= 68) return "Heating Up";
  if (progress >= 28) return "Live";
  return "Needs Scouts";
}

function compareBigDesc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

export async function GET() {
  const assets = await q<AssetRow>(
    `SELECT id, symbol, name, emoji, category, region, base_price, slope, supply, reserve,
            is_sponsored, sponsor_name, sponsor_type, campaign_note, creator_handle
     FROM assets`
  );
  const volumeRows = await q<{ asset_id: string; volume: string; trades: string; traders: string }>(
    `SELECT asset_id,
            COALESCE(SUM(total),0)::text AS volume,
            COUNT(*)::text AS trades,
            COUNT(DISTINCT user_id)::text AS traders
     FROM trades
     GROUP BY asset_id`
  );
  const holderRows = await q<{ asset_id: string; holders: string }>(
    "SELECT asset_id, COUNT(*)::text AS holders FROM holdings WHERE qty > 0 GROUP BY asset_id"
  );

  const volumeBy = new Map(volumeRows.map((r) => [r.asset_id, r]));
  const holdersBy = new Map(holderRows.map((r) => [r.asset_id, Number(r.holders)]));

  const enriched = assets
    .map((a) => {
      const volume = BigInt(volumeBy.get(a.id)?.volume ?? "0");
      const trades = Number(volumeBy.get(a.id)?.trades ?? "0");
      const traders = Number(volumeBy.get(a.id)?.traders ?? "0");
      const holders = holdersBy.get(a.id) ?? 0;
      const price = spotPrice(BigInt(a.base_price), BigInt(a.slope), BigInt(a.supply));
      return { ...a, volume, trades, traders, holders, price };
    })
    .sort((a, b) => {
      const byVolume = compareBigDesc(a.volume, b.volume);
      if (byVolume !== 0) return byVolume;
      return compareBigDesc(BigInt(a.reserve), BigInt(b.reserve));
    });

  const sponsored = enriched.filter((a) => a.is_sponsored);
  const campaignAssets = (sponsored.length > 0 ? sponsored : enriched).slice(0, 6);

  const campaigns = campaignAssets.map((a, i) => {
    const missionType = MISSION_TYPES[i % MISSION_TYPES.length];
    const targetTrades = Math.max(20, a.trades + 18 + i * 6);
    const targetHolders = Math.max(8, a.holders + 5 + i * 2);
    const targetVolume = a.volume + (BigInt(2_500 + i * 1_100) * 1_000_000n);
    const targetMovePct = 5 + i * 2;

    const goalKind = i % 4;
    const progress =
      goalKind === 0
        ? clamp((a.trades / targetTrades) * 100)
        : goalKind === 1
          ? clamp((a.holders / targetHolders) * 100)
          : goalKind === 2
            ? clamp(Number((a.volume * 10_000n) / targetVolume) / 100)
            : clamp(Math.min(100, Number(BigInt(a.supply) % BigInt(35 + i * 5)) * 3));
    const goal =
      goalKind === 0
        ? `reach ${targetTrades} trades`
        : goalKind === 1
          ? `reach ${targetHolders} holders`
          : goalKind === 2
            ? `reach ${microToFloat(targetVolume).toLocaleString("en-US", { maximumFractionDigits: 0 })} $H volume`
            : `move price by ${targetMovePct}%`;
    const sponsor = a.sponsor_name || a.creator_handle || `${a.region} Culture Desk`;
    const rewardPool = BigInt(1_000 + i * 650) * 1_000_000n + a.volume / 50n;

    return {
      id: `${a.symbol.toLowerCase()}-${i}`,
      name: `${a.symbol} ${missionType}`,
      sponsor,
      sponsorType: a.sponsor_type || (a.is_sponsored ? "brand" : "community"),
      asset: {
        symbol: a.symbol,
        name: a.name,
        emoji: a.emoji,
        category: a.category,
        region: a.region,
      },
      missionType,
      simulatedRewardPool: microToFloat(rewardPool),
      goal,
      progress: Math.round(progress),
      status: statusFor(progress),
      note:
        a.campaign_note ||
        "Brands can sponsor cultural markets, creators can launch missions, and scouts can compete to move attention before it peaks.",
      ctas: ["View asset", "Join mission", "Track campaign"],
    };
  });

  return NextResponse.json({
    campaigns,
    summary: {
      activeCampaigns: campaigns.filter((c) => c.status !== "Completed").length,
      simulatedRewardPools: campaigns.reduce((sum, c) => sum + c.simulatedRewardPool, 0),
      sponsoredCampaigns: campaigns.filter((c) => c.sponsorType !== "community").length,
    },
    at: new Date().toISOString(),
  });
}
