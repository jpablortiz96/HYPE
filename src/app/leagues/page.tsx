"use client";

import Link from "next/link";
import useSWR from "swr";
import { compact, fetcher, money } from "@/lib/fmt";

function statusClass(status: string): string {
  if (status === "Heating Up") return "text-amber";
  if (status === "Needs Scouts") return "text-down";
  return "text-up";
}

export default function LeaguesPage() {
  const { data } = useSWR("/api/leagues", fetcher, { refreshInterval: 7000 });
  const leagues = data?.leagues ?? [];

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Culture Leagues</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl">Weekly Scout Competitions</h1>
          <p className="mt-3 max-w-2xl text-mut">
            Sponsored leagues, brand-funded challenges, creator competitions, and premium scout
            tournaments for traders who find signals early.
          </p>
        </div>
        <Link href="/leaderboard" className="btn-ghost">
          View leaderboard
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="panel p-4">
          <p className="eyebrow">Sponsored leagues</p>
          <p className="mt-2 font-mono text-2xl text-amber tnum">{data?.summary?.sponsoredLeagues ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Simulated prize pools</p>
          <p className="mt-2 font-mono text-2xl tnum">
            {data?.summary ? money(data.summary.simulatedPrizePools) : "--"} $H
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Weekly volume</p>
          <p className="mt-2 font-mono text-2xl tnum">{data?.summary ? compact(data.summary.weeklyVolume) : "--"} $H</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {leagues.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel h-64 animate-pulseamber" />)}
        {leagues.map((l: any) => (
          <article key={l.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{l.sponsor}</p>
                <h2 className="mt-1 font-display font-semibold text-2xl">{l.name}</h2>
              </div>
              <span className={`font-mono text-xs ${statusClass(l.status)}`}>{l.status}</span>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3 font-mono text-sm">
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Prize pool</p>
                <p className="mt-2 text-xl text-amber tnum">{money(l.prizePool)} $H</p>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Top asset</p>
                {l.topAsset ? (
                  <Link href={`/asset/${l.topAsset.symbol}`} className="mt-2 block text-amber hover:underline">
                    {l.topAsset.emoji} {l.topAsset.symbol}
                  </Link>
                ) : (
                  <p className="mt-2 text-mut">No signal yet</p>
                )}
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Volume</p>
                <p className="mt-2 text-xl tnum">{compact(l.volume)} $H</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="eyebrow mb-2">Top traders</p>
              <div className="space-y-2">
                {l.topTraders.length === 0 && (
                  <p className="font-mono text-sm text-mut">No public traders yet.</p>
                )}
                {l.topTraders.map((t: any) => (
                  <div key={`${l.id}-${t.rank}-${t.username}`} className="flex justify-between border border-line rounded bg-ink p-2 font-mono text-sm">
                    <span className="text-amber">#{t.rank} @{t.username}</span>
                    <span className="tnum text-mut">{compact(t.volume)} $H</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm text-mut">{l.narrative}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-ghost" disabled>
                Join league
              </button>
              <Link href="/leaderboard" className="btn-ghost">
                View leaderboard
              </Link>
              <Link href="/market" className="btn-amber">
                Trade trends
              </Link>
            </div>
            <p className="mt-3 font-mono text-[10px] text-mut">
              Prize pools are simulated. No rewards, balances, or treasury funds move.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
