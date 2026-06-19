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
        };
      });
    } catch {
      return [];
    }
  }, [raw]);

  return (
    <div className="panel overflow-x-auto">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <div>
          <p className="eyebrow">Market Depth</p>
          <p className="font-mono text-[11px] text-mut mt-1">
            Slippage simulator for the next buy on the live curve.
          </p>
        </div>
        <span className="font-mono text-[10px] text-amberdim">preview only</span>
      </div>
      <table className="w-full min-w-[620px] font-mono text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-amberdim border-b border-line">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3 text-right">Total cost</th>
            <th className="px-4 py-3 text-right">Average price</th>
            <th className="px-4 py-3 text-right">Projected spot</th>
            <th className="px-4 py-3 text-right">Impact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.qty} className="border-b border-line/40 hover:bg-panel2 transition">
              <td className="px-4 py-3 text-amber">Buy next {r.qty} share{r.qty === 1 ? "" : "s"}</td>
              <td className="px-4 py-3 text-right tnum">{money(r.total)} $H</td>
              <td className="px-4 py-3 text-right tnum text-mut">{money(r.avg)} $H</td>
              <td className="px-4 py-3 text-right tnum">{money(r.projected)} $H</td>
              <td className="px-4 py-3 text-right tnum text-up">{r.impact}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 font-mono text-[10px] text-mut">
        Uses the same integer bonding-curve functions as settlement. No DB writes, no trade route.
      </p>
    </div>
  );
}
