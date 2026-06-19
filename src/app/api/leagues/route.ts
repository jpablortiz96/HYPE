import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { microToFloat } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AssetMetric {
  symbol: string;
  name: string;
  emoji: string;
  category: string;
  region: string;
  volume: string;
  trades: string;
}

interface TraderMetric {
  username: string;
  trades: string;
  volume: string;
}

const LEAGUE_DEFS = [
  {
    id: "weekly-culture",
    name: "Weekly Culture League",
    filter: (a: AssetMetric) => true,
    sponsor: "HYPE Pro",
    status: "Live",
  },
  {
    id: "ai-hunters",
    name: "AI Trend Hunters",
    filter: (a: AssetMetric) => a.category.toLowerCase() === "ai" || a.symbol.includes("AI"),
    sponsor: "Brand Scout Cup",
    status: "Heating Up",
  },
  {
    id: "latam-meme",
    name: "LATAM Meme Desk",
    filter: (a: AssetMetric) =>
      a.category.toLowerCase() === "meme" || ["LATAM", "Colombia", "Mexico", "Argentina", "Brazil"].includes(a.region),
    sponsor: "Community Desk",
    status: "Live",
  },
  {
    id: "brand-scout",
    name: "Brand Scout Cup",
    filter: (a: AssetMetric) => true,
    sponsor: "Agency Network",
    status: "Needs Scouts",
  },
  {
    id: "world-cup",
    name: "World Cup Signal League",
    filter: (a: AssetMetric) => a.category.toLowerCase().includes("sport") || a.symbol.includes("GOL"),
    sponsor: "Sports Creators",
    status: "Live",
  },
];

function compareVolumeDesc(a: AssetMetric, b: AssetMetric): number {
  const av = BigInt(a.volume);
  const bv = BigInt(b.volume);
  if (av === bv) return 0;
  return av > bv ? -1 : 1;
}

export async function GET() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const assets = await q<AssetMetric>(
    `SELECT a.symbol, a.name, a.emoji, a.category, a.region,
            COALESCE(SUM(t.total),0)::text AS volume,
            COUNT(t.id)::text AS trades
     FROM assets a
     LEFT JOIN trades t ON t.asset_id = a.id AND t.created_at > $1
     GROUP BY a.id, a.symbol, a.name, a.emoji, a.category, a.region`,
    [weekAgo]
  );
  const traders = await q<TraderMetric>(
    `SELECT u.username,
            COUNT(t.id)::text AS trades,
            COALESCE(SUM(t.total),0)::text AS volume
     FROM users u
     JOIN trades t ON t.user_id = u.id AND t.created_at > $1
     WHERE u.is_bot = false
     GROUP BY u.id, u.username
     ORDER BY volume DESC
     LIMIT 10`,
    [weekAgo]
  );

  const fallbackAsset = assets.slice().sort(compareVolumeDesc)[0] ?? null;
  const topTraders = traders.slice(0, 3).map((t, i) => ({
    rank: i + 1,
    username: t.username,
    trades: Number(t.trades),
    volume: microToFloat(t.volume),
  }));

  const leagues = LEAGUE_DEFS.map((def, i) => {
    const scoped = assets.filter(def.filter);
    const topAsset = (scoped.length ? scoped : assets).slice().sort(compareVolumeDesc)[0] ?? fallbackAsset;
    const volume = (scoped.length ? scoped : assets).reduce((sum, a) => sum + BigInt(a.volume), 0n);
    const prizePool = BigInt(3_000 + i * 1_250) * 1_000_000n + volume / 100n;
    return {
      id: def.id,
      name: def.name,
      sponsor: def.sponsor,
      prizePool: microToFloat(prizePool),
      topTraders,
      topAsset: topAsset && {
        symbol: topAsset.symbol,
        name: topAsset.name,
        emoji: topAsset.emoji,
      },
      volume: microToFloat(volume),
      status: def.status,
      ctas: ["Join league", "View leaderboard", "Trade trends"],
      narrative: "Sponsored leagues, brand-funded challenges, creator competitions, and premium scout tournaments.",
    };
  });

  return NextResponse.json({
    leagues,
    summary: {
      sponsoredLeagues: leagues.filter((l) => l.sponsor !== "Community Desk").length,
      simulatedPrizePools: leagues.reduce((sum, l) => sum + l.prizePool, 0),
      weeklyVolume: leagues[0]?.volume ?? 0,
    },
    at: new Date().toISOString(),
  });
}
