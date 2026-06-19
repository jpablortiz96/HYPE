"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, money, pct, trendClass } from "@/lib/fmt";

interface TickerAsset {
  symbol: string;
  emoji: string;
  price: number;
  change24h: number | null;
}

export default function Ticker() {
  const { data } = useSWR("/api/market", fetcher, { refreshInterval: 4000 });
  const assets: TickerAsset[] = data?.assets ?? [];

  if (assets.length === 0) {
    return (
      <div className="h-7 border-b border-line bg-panel/95 overflow-hidden">
        <div className="mx-auto max-w-6xl h-full px-4 flex items-center">
          <span className="font-mono text-[11px] text-amberdim animate-pulseamber">
            HYPE TAPE / connecting to the floor...
          </span>
        </div>
      </div>
    );
  }

  const strip = [...assets, ...assets];

  return (
    <div className="h-7 border-b border-line bg-panel/95 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-panel to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-panel to-transparent" />
      <div className="flex items-center h-full w-max max-w-none animate-tape will-change-transform">
        {strip.map((a, i) => (
          <Link
            key={`${a.symbol}-${i}`}
            href={`/asset/${a.symbol}`}
            className="flex items-center gap-2 px-4 font-mono text-[11px] whitespace-nowrap hover:bg-panel2"
          >
            <span>{a.emoji}</span>
            <span className="text-amber">{a.symbol}</span>
            <span className="text-paper tnum">{money(a.price)}</span>
            <span className={`tnum ${trendClass(a.change24h)}`}>{pct(a.change24h)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
