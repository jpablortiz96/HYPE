import { q } from "./db";
import { reserveAt } from "./curve";

export interface IntegrityReport {
  totalCash: string;
  totalReserve: string;
  totalMinted: string;
  ledgerBalanced: boolean;   // Σ cash + Σ reserve === Σ minted (exact)
  curveConsistent: boolean;  // every asset reserve matches the closed form
  driftMicro: string;        // 0 if solvent — to the micro
  assetsChecked: number;
  users: number;
  trades: number;
  checkedAt: string;
}

/**
 * The Proof of Solvency. Recomputes, from live data, the two invariants the
 * exchange promises the planet:
 *   1. Σ user cash + Σ asset reserve  ===  Σ minted    (no money created/lost)
 *   2. per asset: reserve === R(supply) closed form     (curve never lied)
 * Both must hold EXACTLY — the ledger is integers, so drift is a bug, not noise.
 */
export async function checkIntegrity(): Promise<IntegrityReport> {
  const [sums] = await q<{ cash: string; minted: string; users: string }>(
    "SELECT COALESCE(SUM(cash),0)::text AS cash, COALESCE(SUM(granted),0)::text AS minted, COUNT(*)::text AS users FROM users"
  );
  const [res] = await q<{ reserve: string }>(
    "SELECT COALESCE(SUM(reserve),0)::text AS reserve FROM assets"
  );
  const [tc] = await q<{ n: string }>("SELECT COUNT(*)::text AS n FROM trades");
  const assets = await q<{ base_price: string; slope: string; supply: string; reserve: string }>(
    "SELECT base_price, slope, supply, reserve FROM assets"
  );

  const totalCash = BigInt(sums.cash);
  const totalReserve = BigInt(res.reserve);
  const totalMinted = BigInt(sums.minted);
  const drift = totalCash + totalReserve - totalMinted;

  let curveConsistent = true;
  for (const a of assets) {
    const expect = reserveAt(BigInt(a.base_price), BigInt(a.slope), BigInt(a.supply));
    if (expect !== BigInt(a.reserve)) {
      curveConsistent = false;
      break;
    }
  }

  return {
    totalCash: totalCash.toString(),
    totalReserve: totalReserve.toString(),
    totalMinted: totalMinted.toString(),
    ledgerBalanced: drift === 0n,
    curveConsistent,
    driftMicro: drift.toString(),
    assetsChecked: assets.length,
    users: Number(sums.users),
    trades: Number(tc.n),
    checkedAt: new Date().toISOString(),
  };
}
