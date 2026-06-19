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
      <div className="h-8 border-b border-line bg-panel flex items-center px-4">
        <span className="font-mono text-xs text-amberdim animate-pulseamber">
          ▮ HYPE TAPE — connecting to the floor…
        </span>
      </div>
    );
  }

  // duplicate the strip so the -50% translate loops seamlessly
  const strip = [...assets, ...assets];

  return (
    <div className="h-8 border-b border-line bg-panel overflow-hidden relative" aria-hidden="true">
      <div className="flex items-center h-full w-max animate-tape">
        {strip.map((a, i) => (
          <Link
            key={`${a.symbol}-${i}`}
            href={`/asset/${a.symbol}`}
            className="flex items-center gap-2 px-5 font-mono text-xs whitespace-nowrap hover:bg-panel2"
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
