import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getOrCreateUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORIES = new Set(["meme", "sound", "creator", "challenge", "ai", "sports", "fashion", "other"]);
const REGIONS = new Set(["LATAM", "Global", "Colombia", "Mexico", "Argentina", "Brazil", "US Hispanic", "Spain", "Other"]);
const SPONSOR_TYPES = new Set(["creator", "brand", "agency", "community"]);

const CURVE_PRESETS: Record<string, { base: bigint; slope: bigint }> = {
  safe: { base: 1_500_000n, slope: 6_000n },
  viral: { base: 3_500_000n, slope: 14_000n },
  premium: { base: 7_000_000n, slope: 25_000n },
};

function cleanText(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));

  const name = cleanText(body.name, 80);
  const symbol = cleanText(body.symbol, 8).toUpperCase();
  const category = cleanText(body.category, 24).toLowerCase();
  const region = cleanText(body.region, 40);
  const emoji = cleanText(body.emoji, 8) || "📈";
  const originStory = cleanText(body.originStory, 900);
  const preset = cleanText(body.curvePreset, 24).toLowerCase();
  const isSponsored = body.isSponsored === true;
  const sponsorName = cleanText(body.sponsorName, 80);
  const sponsorType = cleanText(body.sponsorType, 24).toLowerCase();
  const campaignNote = cleanText(body.campaignNote, 240);

  if (name.length < 3) {
    return NextResponse.json({ error: "Trend name must be at least 3 characters." }, { status: 400 });
  }
  if (!/^[A-Z0-9]{3,8}$/.test(symbol)) {
    return NextResponse.json({ error: "Symbol must be 3-8 uppercase letters or numbers." }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (!REGIONS.has(region)) {
    return NextResponse.json({ error: "Choose a valid region." }, { status: 400 });
  }
  const curve = CURVE_PRESETS[preset];
  if (!curve) {
    return NextResponse.json({ error: "Choose a valid curve preset." }, { status: 400 });
  }
  if (isSponsored && (!sponsorName || !SPONSOR_TYPES.has(sponsorType))) {
    return NextResponse.json({ error: "Sponsored IPOs need a sponsor name and type." }, { status: 400 });
  }

  const duplicate = await q<{ id: string }>("SELECT id FROM assets WHERE symbol = $1 LIMIT 1", [symbol]);
  if (duplicate.length > 0) {
    return NextResponse.json({ error: `${symbol} is already listed. Pick another ticker.` }, { status: 409 });
  }

  const id = randomUUID();
  const now = new Date();
  await q(
    `INSERT INTO assets (
       id, symbol, name, category, emoji, region, base_price, slope, supply, reserve,
       creator_user_id, creator_handle, origin_story, is_sponsored, sponsor_name,
       sponsor_type, campaign_note, created_by_listing, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'0','0',$9,$10,$11,$12,$13,$14,$15,true,$16)`,
    [
      id,
      symbol,
      name,
      category.toUpperCase(),
      emoji,
      region,
      curve.base.toString(),
      curve.slope.toString(),
      user.id,
      user.username,
      originStory || null,
      isSponsored,
      isSponsored ? sponsorName : null,
      isSponsored ? sponsorType : null,
      isSponsored ? campaignNote || null : null,
      now,
    ]
  );

  return NextResponse.json({
    ok: true,
    asset: {
      id,
      symbol,
      name,
      category: category.toUpperCase(),
      emoji,
      region,
      supply: 0,
      reserve: 0,
      isSponsored,
      sponsorName: isSponsored ? sponsorName : null,
    },
  });
}
