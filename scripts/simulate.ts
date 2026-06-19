import "dotenv/config";
import { randomUUID } from "crypto";
import { getPool, q } from "../src/lib/db";
import { executeTrade, TradeError } from "../src/lib/engine";
import { getTreasuryId } from "../src/lib/meta";
import { checkIntegrity } from "../src/lib/integrity";
import { MICRO, floatLabel } from "../src/lib/curve";

/**
 * Two modes, one engine:
 *
 *   --mode pump     THE INSOLVENCY TEST. Fires hundreds of concurrent trades
 *                   from simulated traders at the same hot assets, lets Aurora
 *                   DSQL's optimistic concurrency abort+retry the conflicts,
 *                   then proves Σcash + Σreserve === Σminted to the micro.
 *                   On a weaker data layer this is exactly where a ledger
 *                   silently goes insolvent.
 *
 *   --mode ambient  Gentle background trading so the UI feels alive on camera.
 */

const args = process.argv.slice(2);
function arg(name: string, dflt: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const MODE = arg("mode", "pump");
const TRADES = parseInt(arg("trades", "200"), 10);
const BOTS = parseInt(arg("bots", "24"), 10);
const MINUTES = parseInt(arg("minutes", "3"), 10);
const CONCURRENCY = parseInt(arg("concurrency", "16"), 10);

async function ensureBots(prefix: string, n: number): Promise<string[]> {
  const rows = await q<{ id: string }>(
    "SELECT id FROM users WHERE is_bot = true AND username LIKE $1 ORDER BY username",
    [`${prefix}%`]
  );
  const ids = rows.map((r) => r.id);
  const grant = 100_000n * MICRO;
  while (ids.length < n) {
    const id = randomUUID();
    await q(
      "INSERT INTO users (id, username, cash, granted, is_bot, created_at) VALUES ($1,$2,$3,$3,true,$4)",
      [id, `${prefix}${String(ids.length + 1).padStart(2, "0")}`, grant.toString(), new Date()]
    );
    ids.push(id);
  }
  return ids.slice(0, n);
}

function printReport(label: string, r: Awaited<ReturnType<typeof checkIntegrity>>) {
  console.log(`\n── ${label} ──────────────────────────────────────────`);
  console.log(`   Σ user cash      ${floatLabel(r.totalCash).padStart(20)} $H`);
  console.log(`   Σ asset reserve  ${floatLabel(r.totalReserve).padStart(20)} $H`);
  console.log(`   Σ minted         ${floatLabel(r.totalMinted).padStart(20)} $H`);
  console.log(`   drift            ${r.driftMicro} micro`);
  console.log(`   ledger balanced  ${r.ledgerBalanced ? "YES — EXACT" : "NO !!!"}`);
  console.log(`   curve consistent ${r.curveConsistent ? "YES — all " + r.assetsChecked + " assets" : "NO !!!"}`);
}

async function pump() {
  console.log("HYPE — THE INSOLVENCY TEST");
  console.log(`${TRADES} concurrent trades · ${BOTS} traders · concurrency ${CONCURRENCY}\n`);

  const treasuryId = await getTreasuryId();
  const bots = await ensureBots("pump_bot_", BOTS);
  const symbols = (await q<{ symbol: string }>("SELECT symbol FROM assets")).map((r) => r.symbol);
  const hot = symbols.slice(0, 4); // concentrate fire on 4 assets to force OCC conflicts

  const before = await checkIntegrity();
  printReport("LEDGER BEFORE", before);

  let done = 0, buys = 0, sells = 0, rejected = 0, retries = 0;
  const t0 = Date.now();

  const jobs = Array.from({ length: TRADES }, (_, i) => async () => {
    const userId = bots[i % bots.length];
    const symbol = Math.random() < 0.8 ? hot[i % hot.length] : symbols[i % symbols.length];
    const side = Math.random() < 0.7 ? "BUY" : "SELL";
    const qty = 1 + Math.floor(Math.random() * 8);
    try {
      const r = await executeTrade(userId, symbol, side as any, qty, treasuryId);
      retries += r.retries;
      side === "BUY" ? buys++ : sells++;
    } catch (e) {
      if (e instanceof TradeError) rejected++; // e.g. selling shares you don't own — correctly refused
      else throw e;
    } finally {
      done++;
      if (done % 50 === 0) process.stdout.write(`   ${done}/${TRADES} settled…\n`);
    }
  });

  // simple concurrency limiter
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        await job();
      }
    })
  );

  const secs = (Date.now() - t0) / 1000;
  const after = await checkIntegrity();
  printReport("LEDGER AFTER", after);

  console.log(`\n── RESULT ────────────────────────────────────────────`);
  console.log(`   settled            ${buys + sells} (${buys} buys / ${sells} sells)`);
  console.log(`   correctly refused  ${rejected} (insufficient shares/funds)`);
  console.log(`   OCC conflicts retried by the engine: ${retries}`);
  console.log(`   throughput         ${((buys + sells + rejected) / secs).toFixed(1)} tx/s over ${secs.toFixed(1)}s`);

  const solvent = after.ledgerBalanced && after.curveConsistent;
  console.log(`\n   ${solvent ? "✔ THE LEDGER NEVER LIES — solvent to the micro." : "✘ INSOLVENT — invariant broken."}`);
  await getPool().end();
  process.exit(solvent ? 0 : 1);
}

async function ambient() {
  console.log(`HYPE ambient market — trading gently for ${MINUTES} min (Ctrl+C to stop)…`);
  const treasuryId = await getTreasuryId();
  const bots = await ensureBots("flow_bot_", 8);
  const symbols = (await q<{ symbol: string }>("SELECT symbol FROM assets")).map((r) => r.symbol);
  const until = Date.now() + MINUTES * 60_000;
  while (Date.now() < until) {
    const userId = bots[Math.floor(Math.random() * bots.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() < 0.65 ? "BUY" : "SELL";
    const qty = 1 + Math.floor(Math.random() * 5);
    try {
      const r = await executeTrade(userId, symbol, side as any, qty, treasuryId);
      console.log(`   ${side.padEnd(4)} ${String(qty).padStart(2)} ${symbol.padEnd(8)} -> price ${floatLabel(r.newPrice)} $H`);
    } catch {
      /* refused trades are fine in ambient mode */
    }
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 2600));
  }
  await getPool().end();
}

(MODE === "ambient" ? ambient() : pump()).catch((e) => {
  console.error("simulate failed:", e);
  process.exit(1);
});
