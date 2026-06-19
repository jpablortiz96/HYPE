"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, money, pct, trendClass } from "@/lib/fmt";

export default function PortfolioPage() {
  const { data, mutate } = useSWR("/api/portfolio", fetcher, { refreshInterval: 4000 });
  const { mutate: globalMutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [handle, setHandle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function saveHandle() {
    setErr(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: handle }),
    });
    const d = await res.json();
    if (!res.ok) {
      setErr(d.error ?? "That handle didn't work.");
      return;
    }
    setEditing(false);
    mutate();
    globalMutate("/api/me");
    globalMutate("/api/leaderboard");
  }

  if (!data) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-10 w-72 bg-panel rounded animate-pulseamber" />
        <div className="h-40 bg-panel rounded animate-pulseamber" />
      </div>
    );
  }

  const totalPnl = data.netWorth - data.startingCash;
  const totalPnlPct = (totalPnl / data.startingCash) * 100;

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Trader account</p>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-3xl text-mut">@</span>
              <input
                autoFocus
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveHandle()}
                placeholder={data.user.username}
                className="bg-ink border border-amber rounded px-3 py-1.5 font-mono text-lg w-56"
              />
              <button onClick={saveHandle} className="btn-amber">Save</button>
              <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
            </div>
          ) : (
            <h1 className="font-display font-extrabold text-3xl">
              @{data.user.username}
              <button
                onClick={() => {
                  setHandle("");
                  setEditing(true);
                }}
                className="ml-3 font-mono text-xs text-amberdim hover:text-amber align-middle"
              >
                claim handle
              </button>
            </h1>
          )}
          {err && <p className="font-mono text-xs text-down mt-1">{err}</p>}
        </div>
        <div className="text-right">
          <p className="eyebrow">Net worth</p>
          <p className="font-mono text-3xl text-amber tnum">{money(data.netWorth)} $H</p>
          <p className={`font-mono text-sm tnum ${trendClass(totalPnl)}`}>
            {pct(totalPnlPct)} since funding
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="panel p-4">
          <p className="eyebrow">Cash</p>
          <p className="font-mono text-xl tnum">{money(data.cash)} $H</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Holdings (exit value, net of 1% fee)</p>
          <p className="font-mono text-xl tnum">{money(data.holdingsValue)} $H</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Funded with</p>
          <p className="font-mono text-xl tnum text-mut">{money(data.startingCash)} $H</p>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[680px] font-mono text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-amberdim border-b border-line">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Avg cost</th>
              <th className="px-4 py-3 text-right">Spot</th>
              <th className="px-4 py-3 text-right">Exit value</th>
              <th className="px-4 py-3 text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {data.positions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mut">
                  Flat book. The{" "}
                  <Link href="/market" className="text-amber hover:underline">
                    board
                  </Link>{" "}
                  is open.
                </td>
              </tr>
            )}
            {data.positions.map((p: any) => (
              <tr key={p.symbol} className="border-b border-line/50 hover:bg-panel2 transition">
                <td className="px-4 py-3">
                  <Link href={`/asset/${p.symbol}`} className="text-amber hover:underline">
                    {p.emoji} {p.symbol}
                  </Link>
                  <span className="block text-xs text-mut font-sans">{p.name}</span>
                </td>
                <td className="px-4 py-3 text-right tnum">{p.qty}</td>
                <td className="px-4 py-3 text-right tnum text-mut">{money(p.avgCost)}</td>
                <td className="px-4 py-3 text-right tnum">{money(p.spot)}</td>
                <td className="px-4 py-3 text-right tnum">{money(p.value)}</td>
                <td className={`px-4 py-3 text-right tnum ${trendClass(p.pnl)}`}>
                  {money(p.pnl)} ({pct(p.pnlPct, 1)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
