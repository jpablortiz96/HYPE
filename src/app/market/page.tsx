"use client";

import Link from "next/link";
import useSWR from "swr";
import Sparkline from "@/components/Sparkline";
import IntegrityBadge from "@/components/IntegrityBadge";
import { fetcher, money, compact, pct, trendClass } from "@/lib/fmt";

export default function MarketPage() {
  const { data } = useSWR("/api/market", fetcher, { refreshInterval: 4000 });
  const assets = data?.assets ?? [];
  const sponsored = assets.filter((a: any) => a.sponsorship).slice(0, 3);

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow">Listed assets · sorted by reserve</p>
          <h1 className="font-display font-extrabold text-3xl">The Board</h1>
        </div>
        <IntegrityBadge />
      </div>

      {sponsored.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {sponsored.map((a: any) => (
            <Link key={a.symbol} href={`/asset/${a.symbol}`} className="panel p-4 block hover:border-amber transition">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Sponsored IPO</span>
                <span className="font-mono text-[10px] text-ink bg-amber px-2 py-0.5 rounded">
                  Campaign-ready
                </span>
              </div>
              <div className="mt-3 font-mono text-lg text-amber">
                {a.emoji} {a.symbol}
              </div>
              <p className="text-sm text-mut">{a.name}</p>
              <p className="mt-2 font-mono text-xs text-amberdim">
                {a.sponsorship.sponsorName ?? "Promoted cultural market"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] font-mono text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-amberdim border-b border-line">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Price ($H)</th>
              <th className="px-4 py-3 text-right">24h</th>
              <th className="px-4 py-3 text-right">Vol 24h</th>
              <th className="px-4 py-3 text-right">Supply</th>
              <th className="px-4 py-3 text-right">Reserve ($H)</th>
              <th className="px-4 py-3 text-right">48h</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-line/50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 bg-panel2 rounded animate-pulseamber" />
                  </td>
                </tr>
              ))}
            {assets.map((a: any) => (
              <tr key={a.symbol} className="border-b border-line/50 hover:bg-panel2 transition">
                <td className="px-4 py-3">
                  <Link href={`/asset/${a.symbol}`} className="flex items-center gap-3 group">
                    <span className="text-lg">{a.emoji}</span>
                    <span>
                      <span className="text-amber group-hover:underline">{a.symbol}</span>
                      {a.sponsorship && (
                        <span className="ml-2 align-middle font-mono text-[10px] text-ink bg-amber px-1.5 py-0.5 rounded">
                          Promoted
                        </span>
                      )}
                      <span className="block text-xs text-mut font-sans">
                        {a.name} · {a.region}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tnum">{money(a.price)}</td>
                <td className={`px-4 py-3 text-right tnum ${trendClass(a.change24h)}`}>
                  {pct(a.change24h)}
                </td>
                <td className="px-4 py-3 text-right tnum text-mut">{compact(a.volume24h)}</td>
                <td className="px-4 py-3 text-right tnum text-mut">{a.supply.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tnum text-mut">{compact(a.reserve)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Sparkline points={a.spark} up={(a.change24h ?? 0) >= 0} width={96} height={26} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-mono text-xs text-mut">
        Prices come straight from each asset&apos;s bonding curve: P(s) = base + slope · supply.
        Reserve is the cash the curve holds to buy every share back.
      </p>
    </div>
  );
}
