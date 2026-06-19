"use client";

import Link from "next/link";
import useSWR from "swr";
import { compact, fetcher, money, pct, trendClass } from "@/lib/fmt";

export default function ProfileView({ slug }: { slug: string }) {
  const { data } = useSWR(`/api/profile/${slug}`, fetcher, { refreshInterval: 7000 });
  const profile = data?.profile;

  if (!profile) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-10 w-72 bg-panel rounded animate-pulseamber" />
        <div className="h-52 bg-panel rounded animate-pulseamber" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Public culture profile</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl">{profile.name}</h1>
          <p className="mt-2 font-mono text-sm text-amberdim">{profile.type}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/list" className="btn-amber">
            Sponsor a trend
          </Link>
          <Link href="/pro" className="btn-ghost">
            View Pro Analytics
          </Link>
        </div>
      </div>

      {data.empty ? (
        <div className="panel p-8 text-center">
          <p className="font-display text-2xl mb-2">No campaigns yet.</p>
          <p className="text-mut">Launch a cultural IPO to create the first signal.</p>
          <Link href="/list" className="btn-amber inline-block mt-5">
            Launch IPO
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="panel p-4 lg:col-span-1">
              <p className="eyebrow">Trends launched</p>
              <p className="mt-2 font-mono text-2xl tnum">{profile.trendsLaunched}</p>
            </div>
            <div className="panel p-4 lg:col-span-1">
              <p className="eyebrow">Sponsored trends</p>
              <p className="mt-2 font-mono text-2xl tnum">{profile.sponsoredTrends}</p>
            </div>
            <div className="panel p-4 lg:col-span-2">
              <p className="eyebrow">Total culture volume</p>
              <p className="mt-2 font-mono text-2xl text-amber tnum">{money(profile.totalCultureVolume)} $H</p>
            </div>
            <div className="panel p-4 lg:col-span-2">
              <p className="eyebrow">Estimated creator royalties</p>
              <p className="mt-2 font-mono text-2xl tnum">{money(profile.estimatedCreatorRoyalties)} $H</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-4 mb-6">
            <div className="panel p-5">
              <p className="eyebrow">Linked assets</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {profile.linkedAssets.map((a: any) => (
                  <Link key={a.symbol} href={`/asset/${a.symbol}`} className="border border-line rounded bg-ink p-4 hover:border-amber transition">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-lg text-amber">{a.emoji} {a.symbol}</span>
                      {a.isSponsored && (
                        <span className="font-mono text-[10px] text-ink bg-amber px-2 py-0.5 rounded">
                          Sponsored
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-mut">{a.name}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                      <span className="text-mut">Vol {compact(a.volume)}</span>
                      <span className="text-mut">Trades {a.trades}</span>
                      <span className={trendClass(a.performance)}>{pct(a.performance, 1)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="panel p-4">
                <p className="eyebrow">Campaign readiness</p>
                <p className="mt-2 font-mono text-5xl text-amber tnum">{profile.campaignReadinessScore}</p>
                <div className="mt-3 h-2 rounded bg-ink border border-line overflow-hidden">
                  <div className="h-full bg-amber" style={{ width: `${profile.campaignReadinessScore}%` }} />
                </div>
              </div>
              <div className="panel p-4">
                <p className="eyebrow">Best performing IPO</p>
                {profile.bestPerformingIpo ? (
                  <Link href={`/asset/${profile.bestPerformingIpo.symbol}`} className="mt-3 block font-mono text-amber hover:underline">
                    {profile.bestPerformingIpo.emoji} {profile.bestPerformingIpo.symbol}
                    <span className={`block mt-2 ${trendClass(profile.bestPerformingIpo.performance)}`}>
                      {pct(profile.bestPerformingIpo.performance, 1)}
                    </span>
                  </Link>
                ) : (
                  <p className="mt-3 text-mut">No IPO performance yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
