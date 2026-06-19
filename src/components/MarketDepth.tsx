"use client";

import { useMemo } from "react";
import { buyCost, microToFloat, spotPrice } from "@/lib/curve";
import { money } from "@/lib/fmt";

interface Props {
  raw: { base: string; slope: string; supply: string };
}

const LADDER = [1, 5, 10, 25, 50];

function pctFromBps(bps: bigint): string {
  const n = Number(bps) / 100;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function MarketDepth({ raw }: Props) {
  const rows = useMemo(() => {
    try {
      const base = BigInt(raw.base);
      const slope = BigInt(raw.slope);
      const supply = BigInt(raw.supply);
      const currentSpot = spotPrice(base, slope, supply);

      return LADDER.map((qty) => {
        const q = BigInt(qty);
        const total = buyCost(base, slope, supply, q);
        const avg = total / q;
        const projected = spotPrice(base, slope, supply + q);
        const impactBps =
          currentSpot > 0n ? ((projected - currentSpot) * 10_000n) / currentSpot : 0n;

        return {
          qty,
          total: microToFloat(total),
          avg: microToFloat(avg),
          projected: microToFloat(projected),
          impact: pctFromBps(impactBps),
          impactPct: Number(impactBps) / 100,
        };
      });
    } catch {
      return [];
    }
  }, [raw]);

  const maxImpact = Math.max(...rows.map((r) => r.impactPct), 0.01);

  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Market Depth</p>
          <p className="font-mono text-[11px] text-mut mt-1">
            Slippage simulator for the next buy on the live curve.
          </p>
        </div>
        <span className="rounded border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber">
          preview only
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] font-mono text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-amberdim border-b border-line">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Total cost</th>
              <th className="px-4 py-3 text-right">Avg fill</th>
              <th className="px-4 py-3 text-right">Projected spot</th>
              <th className="px-4 py-3 text-right">Impact</th>
              <th className="px-4 py-3">Pressure</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.qty} className="border-b border-line/40 hover:bg-panel2 transition">
                <td className="px-4 py-3 text-amber">Buy next {r.qty} share{r.qty === 1 ? "" : "s"}</td>
                <td className="px-4 py-3 text-right tnum">{money(r.total)} $H</td>
                <td className="px-4 py-3 text-right tnum text-mut">{money(r.avg)} $H</td>
                <td className="px-4 py-3 text-right tnum text-paper">{money(r.projected)} $H</td>
                <td className="px-4 py-3 text-right tnum text-up">{r.impact}</td>
                <td className="px-4 py-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded bg-ink border border-line">
                    <div
                      className="h-full rounded bg-up"
                      style={{ width: `${Math.max(6, Math.min(100, (r.impactPct / maxImpact) * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 font-mono text-[10px] text-mut">
        Uses the same integer bonding-curve functions as settlement. No DB writes, no trade route.
      </p>
    </div>
  );
}
