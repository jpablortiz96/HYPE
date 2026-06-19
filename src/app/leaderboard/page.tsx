"use client";

import useSWR from "swr";
import { fetcher, money, pct, trendClass } from "@/lib/fmt";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { data } = useSWR("/api/leaderboard", fetcher, { refreshInterval: 5000 });
  const board = data?.board ?? [];

  return (
    <div className="py-8">
      <p className="eyebrow">Top 25 traders · net worth at spot · one SQL statement</p>
      <h1 className="font-display font-extrabold text-3xl mb-6">Leaderboard</h1>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[560px] font-mono text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-amberdim border-b border-line">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Trader</th>
              <th className="px-4 py-3 text-right">Cash</th>
              <th className="px-4 py-3 text-right">Holdings</th>
              <th className="px-4 py-3 text-right">Net worth</th>
              <th className="px-4 py-3 text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {board.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line/50">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-4 bg-panel2 rounded animate-pulseamber" />
                  </td>
                </tr>
              ))}
            {board.map((r: any) => (
              <tr key={r.rank} className="border-b border-line/50 hover:bg-panel2 transition">
                <td className="px-4 py-3 text-mut">{MEDALS[r.rank - 1] ?? r.rank}</td>
                <td className="px-4 py-3 text-amber">@{r.username}</td>
                <td className="px-4 py-3 text-right tnum text-mut">{money(r.cash)}</td>
                <td className="px-4 py-3 text-right tnum text-mut">{money(r.holdingsValue)}</td>
                <td className="px-4 py-3 text-right tnum">{money(r.netWorth)} $H</td>
                <td className={`px-4 py-3 text-right tnum ${trendClass(r.pnlPct)}`}>
                  {pct(r.pnlPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-mono text-xs text-mut">
        Everyone starts with 10,000 $H. Bots are excluded. Rankings are computed by the database
        in a single aggregate query — the app just renders the rows.
      </p>
    </div>
  );
}
