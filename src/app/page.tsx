"use client";

import Link from "next/link";
import useSWR from "swr";
import IntegrityBadge from "@/components/IntegrityBadge";
import Sparkline from "@/components/Sparkline";
import { fetcher, money, pct, trendClass } from "@/lib/fmt";

export default function Landing() {
  const { data } = useSWR("/api/market", fetcher, { refreshInterval: 4000 });
  const movers = (data?.assets ?? [])
    .slice()
    .sort((a: any, b: any) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0))
    .slice(0, 4);

  return (
    <div>
      {/* HERO */}
      <section className="py-16 sm:py-24">
        <p className="eyebrow mb-4">Global market · open 24/7 · settled to the micro</p>
        <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.05] tracking-tight">
          Culture moves markets.
          <br />
          <span className="text-amber">Now it has one.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-mut text-lg">
          HYPE is a stock exchange for the internet&apos;s living culture — memes, sounds and
          trends from LATAM and beyond. Every share trades on a transparent bonding curve, and
          every micro-unit of money is accounted for. No order book theater: real settlement,
          real concurrency, real database guarantees.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/market" className="btn-amber text-base px-6 py-3">
            Start trading — 10,000 $H free
          </Link>
          <IntegrityBadge />
        </div>
        <p className="mt-3 font-mono text-xs text-mut">
          No signup. A guest account opens the moment you trade.
        </p>
      </section>

      {/* MOVERS */}
      <section className="pb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display font-semibold text-xl">Today&apos;s movers</h2>
          <Link href="/market" className="font-mono text-xs text-amberdim hover:text-amber">
            full board →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {movers.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="panel h-28 animate-pulseamber" />
              ))
            : movers.map((a: any) => (
                <Link key={a.symbol} href={`/asset/${a.symbol}`} className="panel p-4 hover:border-amber transition block">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-amber">
                      {a.emoji} {a.symbol}
                    </span>
                    <span className={`font-mono text-xs tnum ${trendClass(a.change24h)}`}>
                      {pct(a.change24h)}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-lg tnum">{money(a.price)} $H</div>
                  <div className="mt-2">
                    <Sparkline points={a.spark} up={(a.change24h ?? 0) >= 0} />
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* THESIS */}
      <section className="pb-20 grid md:grid-cols-3 gap-4">
        <div className="panel p-5">
          <p className="eyebrow mb-2">The asset class</p>
          <h3 className="font-display font-semibold text-lg mb-2">Culture, priced honestly</h3>
          <p className="text-mut text-sm">
            Each asset trades on a public linear bonding curve: P(s) = base + slope·s. Buying mints
            shares and pushes the price up; selling burns them and pulls it down. The curve is the
            market maker — no hidden spread, no house edge beyond a disclosed 1% sell fee.
          </p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow mb-2">The engine</p>
          <h3 className="font-display font-semibold text-lg mb-2">Aurora DSQL settlement</h3>
          <p className="text-mut text-sm">
            Every trade is a strongly-consistent ACID transaction on Amazon Aurora DSQL.
            Concurrent trades collide, the database detects it, the engine retries — and the
            ledger never bends. Active-active and multi-region by design, so the exchange scales
            to a planet of traders without a single write master.
          </p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow mb-2">The receipt</p>
          <h3 className="font-display font-semibold text-lg mb-2">Proof of Solvency, live</h3>
          <p className="text-mut text-sm">
            All money is integer micro-units. At any moment, user cash + curve reserves must equal
            every $H ever minted — exactly, not approximately. The{" "}
            <Link href="/ledger" className="text-amber hover:underline">
              ledger page
            </Link>{" "}
            re-audits the whole exchange every few seconds, in public.
          </p>
        </div>
      </section>
    </div>
  );
}
