import "dotenv/config";
import { randomUUID } from "crypto";
import { getPool } from "../src/lib/db";
import { buyCost, sellProceeds, sellFee, MICRO } from "../src/lib/curve";

/**
 * Seeds the Culture Market: 12 cultural assets + 72 hours of honest synthetic
 * trading history. "Honest" means the history is generated through the exact
 * same bonding-curve math as live trades, so the solvency invariant holds to
 * the micro from the very first second. Seeded accounts are sample data and
 * are disclosed as such in the README.
 */

// ---------- deterministic RNG so every seed run is reproducible ----------
let rngState = 0x9e3779b9;
function rnd(): number {
  rngState ^= rngState << 13; rngState >>>= 0;
  rngState ^= rngState >> 17;
  rngState ^= rngState << 5; rngState >>>= 0;
  return rngState / 0xffffffff;
}
function ri(min: number, max: number): number {
  return Math.floor(min + rnd() * (max - min + 1));
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }

// ---------- the market ----------
const H = (n: number) => BigInt(Math.round(n * 1_000_000)); // $H -> micro

const ASSETS = [
  { symbol: "CAPY",    name: "Capybara Supremacy", category: "MEME",      emoji: "🦫", region: "Global",    base: H(2.5),  slope: H(0.012) },
  { symbol: "CHISME",  name: "Chisme Time",        category: "MEME",      emoji: "☕", region: "LATAM",     base: H(1.8),  slope: H(0.01)  },
  { symbol: "PERREO",  name: "Perreo Intenso",     category: "SOUND",     emoji: "🔊", region: "Caribbean", base: H(4.2),  slope: H(0.015) },
  { symbol: "CORRIDO", name: "Corridos Tumbados",  category: "SOUND",     emoji: "🪗", region: "México",    base: H(5.1),  slope: H(0.018) },
  { symbol: "CUMBIA",  name: "Cumbia 404",         category: "SOUND",     emoji: "🛸", region: "Andes",     base: H(2.2),  slope: H(0.011) },
  { symbol: "LOFIAND", name: "Lo-Fi Andino",       category: "SOUND",     emoji: "🏔️", region: "Andes",     base: H(1.4),  slope: H(0.008) },
  { symbol: "MATE",    name: "Mate Aesthetic",     category: "AESTHETIC", emoji: "🧉", region: "Cono Sur",  base: H(1.9),  slope: H(0.009) },
  { symbol: "NOVELA",  name: "Telenovela Core",    category: "AESTHETIC", emoji: "💔", region: "LATAM",     base: H(2.8),  slope: H(0.013) },
  { symbol: "PARCE",   name: "Parcero Energy",     category: "SLANG",     emoji: "⚡", region: "Colombia",  base: H(1.2),  slope: H(0.007) },
  { symbol: "GOLAZO",  name: "Golazo Mode",        category: "SPORT",     emoji: "⚽", region: "Global",    base: H(3.6),  slope: H(0.014) },
  { symbol: "TAQUITO", name: "Taquito Dorado",     category: "FOOD",      emoji: "🌮", region: "México",    base: H(2.4),  slope: H(0.01)  },
  { symbol: "ALPACA",  name: "Alpaca Drip",        category: "FASHION",   emoji: "🦙", region: "Andes",     base: H(3.1),  slope: H(0.012) },
];

const FOUNDERS = ["la_jefa_cripto", "don_diversificado", "tape_reader_ok", "mango_capital", "fomo_sapiens", "alpha_capy"];
const STARTING_CASH = 10_000n * MICRO;
const MM_CASH = 5_000_000n * MICRO;

interface SimUser { id: string; username: string; cash: bigint; granted: bigint; isBot: boolean }
interface SimAsset { id: string; supply: bigint; reserve: bigint; base: bigint; slope: bigint; meta: (typeof ASSETS)[number] }
interface SimTrade { id: string; userId: string; assetId: string; side: string; qty: bigint; price: bigint; total: bigint; at: Date }

async function main() {
  const pool = getPool();
  console.log("Wiping previous data…");
  for (const t of ["trades", "holdings", "assets", "users"]) {
    await pool.query(`DELETE FROM ${t}`);
  }

  const treasury: SimUser = { id: randomUUID(), username: "HYPE_TREASURY", cash: 0n, granted: 0n, isBot: true };
  const mm: SimUser = { id: randomUUID(), username: "market_maker", cash: MM_CASH, granted: MM_CASH, isBot: true };
  const founders: SimUser[] = FOUNDERS.map((u) => ({ id: randomUUID(), username: u, cash: STARTING_CASH, granted: STARTING_CASH, isBot: false }));
  const users = [treasury, mm, ...founders];
  const byId = new Map(users.map((u) => [u.id, u]));

  const assets: SimAsset[] = ASSETS.map((m) => ({ id: randomUUID(), supply: 0n, reserve: 0n, base: m.base, slope: m.slope, meta: m }));

  // holdings[userId][assetId] = { qty, basis }
  const holdings = new Map<string, Map<string, { qty: bigint; basis: bigint }>>();
  const getH = (u: string, a: string) => {
    let m = holdings.get(u);
    if (!m) { m = new Map(); holdings.set(u, m); }
    let h = m.get(a);
    if (!h) { h = { qty: 0n, basis: 0n }; m.set(a, h); }
    return h;
  };

  const trades: SimTrade[] = [];
  const start = Date.now() - 72 * 3600 * 1000;

  console.log("Simulating 72h of market history through the live curve math…");
  for (const asset of assets) {
    let t = start + ri(0, 30) * 60_000;
    const events = ri(28, 46);
    for (let i = 0; i < events && t < Date.now() - 60_000; i++) {
      const actor = rnd() < 0.62 ? mm : pick(founders);
      const h = getH(actor.id, asset.id);
      const wantSell = h.qty > 0n && rnd() < 0.32;
      if (wantSell) {
        const qty = BigInt(ri(1, Math.min(Number(h.qty), actor === mm ? 40 : 10)));
        const proceeds = sellProceeds(asset.base, asset.slope, asset.supply, qty);
        const fee = sellFee(proceeds);
        actor.cash += proceeds - fee;
        treasury.cash += fee;
        asset.supply -= qty;
        asset.reserve -= proceeds;
        const basisOut = h.qty === qty ? h.basis : (h.basis * qty) / h.qty;
        h.qty -= qty; h.basis -= basisOut;
        trades.push({ id: randomUUID(), userId: actor.id, assetId: asset.id, side: "SELL", qty, price: proceeds / qty, total: proceeds, at: new Date(t) });
      } else {
        const qty = BigInt(actor === mm ? ri(5, 60) : ri(1, 14));
        const cost = buyCost(asset.base, asset.slope, asset.supply, qty);
        if (actor.cash < cost) { t += ri(20, 160) * 60_000; continue; }
        actor.cash -= cost;
        asset.supply += qty;
        asset.reserve += cost;
        h.qty += qty; h.basis += cost;
        trades.push({ id: randomUUID(), userId: actor.id, assetId: asset.id, side: "BUY", qty, price: cost / qty, total: cost, at: new Date(t) });
      }
      t += ri(20, 160) * 60_000;
    }
  }

  // exact invariant check before touching the database
  const totalCash = users.reduce((s, u) => s + u.cash, 0n);
  const totalReserve = assets.reduce((s, a) => s + a.reserve, 0n);
  const totalMinted = users.reduce((s, u) => s + u.granted, 0n);
  if (totalCash + totalReserve !== totalMinted) {
    throw new Error("Seed invariant broken — refusing to write.");
  }
  console.log(`Invariant verified pre-write: Σcash + Σreserve = Σminted = ${totalMinted} micro (exact).`);

  console.log(`Writing ${users.length} users, ${assets.length} assets, ${trades.length} trades…`);
  for (const u of users) {
    await pool.query(
      "INSERT INTO users (id, username, cash, granted, is_bot, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [u.id, u.username, u.cash.toString(), u.granted.toString(), u.isBot, new Date(start)]
    );
  }
  for (const a of assets) {
    await pool.query(
      "INSERT INTO assets (id, symbol, name, category, emoji, region, base_price, slope, supply, reserve, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [a.id, a.meta.symbol, a.meta.name, a.meta.category, a.meta.emoji, a.meta.region, a.base.toString(), a.slope.toString(), a.supply.toString(), a.reserve.toString(), new Date(start)]
    );
  }
  for (const [uid, m] of holdings) {
    for (const [aid, h] of m) {
      if (h.qty > 0n) {
        await pool.query(
          "INSERT INTO holdings (user_id, asset_id, qty, cost_basis, updated_at) VALUES ($1,$2,$3,$4,$5)",
          [uid, aid, h.qty.toString(), h.basis.toString(), new Date()]
        );
      }
    }
  }
  // batched trade inserts (8 params per row, 50 rows per statement)
  for (let i = 0; i < trades.length; i += 50) {
    const chunk = trades.slice(i, i + 50);
    const values: string[] = [];
    const params: any[] = [];
    chunk.forEach((tr, j) => {
      const o = j * 8;
      values.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8})`);
      params.push(tr.id, tr.userId, tr.assetId, tr.side, tr.qty.toString(), tr.price.toString(), tr.total.toString(), tr.at);
    });
    await pool.query(
      `INSERT INTO trades (id, user_id, asset_id, side, qty, price, total, created_at) VALUES ${values.join(",")}`,
      params
    );
  }

  console.log("Seed complete. Market is live, solvent, and reproducible.");
  await pool.end();
}

main().catch((e) => {
  console.error("db:seed failed:", e.message);
  process.exit(1);
});
