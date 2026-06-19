"use client";

import Link from "next/link";
import useSWR from "swr";
import { compact, fetcher, money, pct, trendClass } from "@/lib/fmt";

function ScoreDial({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className="font-mono text-xs text-mut">0-100</span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="font-mono text-4xl text-amber tnum">{value}</span>
        <span className="font-mono text-xs text-amberdim">signal</span>
      </div>
      <div className="mt-3 h-2 rounded bg-ink border border-line overflow-hidden">
        <div className="h-full bg-amber" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AssetSignal({
  eyebrow,
  asset,
  value,
  valueClass = "text-paper",
}: {
  eyebrow: string;
  asset: any;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="eyebrow">{eyebrow}</p>
      {asset ? (
        <Link href={`/asset/${asset.symbol}`} className="mt-3 block group">
          <div className="font-mono text-xl text-amber group-hover:underline">
            {asset.emoji} {asset.symbol}
          </div>
          <div className="text-sm text-mut">{asset.name}</div>
          <div className={`mt-3 font-mono text-2xl tnum ${valueClass}`}>{value}</div>
        </Link>
      ) : (
        <div className="mt-6 h-16 bg-panel2 rounded animate-pulseamber" />
      )}
    </div>
  );
}

export default function ProPage() {
  const { data } = useSWR("/api/pro", fetcher, { refreshInterval: 6000 });
  const metrics = data?.metrics;
  const scores = data?.scores;
  const monetization = data?.monetization;

  return (
    <div className="py-8">
      <section className="mb-8">
        <p className="eyebrow">HYPE Pro</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl">
              Cultural Intelligence Terminal
            </h1>
            <p className="mt-4 max-w-2xl text-mut">
              HYPE is not only a meme market. It is a monetization layer for internet culture:
              a live signal system for creators, agencies, brands, and trend researchers.
            </p>
          </div>
          <Link href="/market" className="btn-ghost">
            Open market
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="panel p-4">
          <p className="eyebrow">Market volume</p>
          <p className="mt-2 font-mono text-2xl text-amber tnum">
            {metrics ? money(metrics.marketVolume) : "--"} $H
          </p>
          <p className="mt-1 font-mono text-xs text-mut">settled through the culture tape</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Listed trends</p>
          <p className="mt-2 font-mono text-2xl tnum">{metrics ? metrics.listedTrends : "--"}</p>
          <p className="mt-1 font-mono text-xs text-mut">live cultural assets</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Total trades</p>
          <p className="mt-2 font-mono text-2xl tnum">{metrics ? compact(metrics.totalTrades) : "--"}</p>
          <p className="mt-1 font-mono text-xs text-mut">behavioral market prints</p>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-3 mb-6">
        <AssetSignal
          eyebrow="Top momentum asset"
          asset={metrics?.topMomentum}
          value={metrics?.topMomentum ? pct(metrics.topMomentum.change24h) : "--"}
          valueClass={trendClass(metrics?.topMomentum?.change24h)}
        />
        <AssetSignal
          eyebrow="Highest 24h volume"
          asset={metrics?.highest24hVolume}
          value={metrics?.highest24hVolume ? `${compact(metrics.highest24hVolume.volume24h)} $H` : "--"}
          valueClass="text-amber"
        />
        <AssetSignal
          eyebrow="Most volatile"
          asset={metrics?.mostVolatile}
          value={metrics?.mostVolatile ? pct(metrics.mostVolatile.volatility) : "--"}
          valueClass="text-up"
        />
      </section>

      <section className="grid md:grid-cols-3 gap-3 mb-6">
        <ScoreDial label="Culture Opportunity Score" value={scores?.cultureOpportunity ?? 0} />
        <ScoreDial label="Brand Readiness Score" value={scores?.brandReadiness ?? 0} />
        <ScoreDial label="Creator Monetization Potential" value={scores?.creatorMonetization ?? 0} />
      </section>

      <section className="panel p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Monetization Surface</p>
            <h2 className="mt-2 font-display font-semibold text-2xl">
              Sponsored markets and simulated creator revenue
            </h2>
            <p className="mt-2 text-sm text-mut max-w-2xl">
              HYPE Pro turns culture volume into a future B2B surface: promoted IPOs,
              campaign-ready assets, and estimated creator royalty intelligence.
            </p>
          </div>
          <div className="font-mono text-right">
            <p className="text-4xl text-amber tnum">{monetization?.brandOpportunityScore ?? 0}</p>
            <p className="text-xs text-mut">brand opportunity score</p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="border border-line rounded bg-ink p-3">
            <p className="eyebrow">Sponsored trends</p>
            <p className="mt-2 font-mono text-2xl tnum">{monetization?.sponsoredTrendsCount ?? 0}</p>
          </div>
          <div className="border border-line rounded bg-ink p-3">
            <p className="eyebrow">Estimated royalties</p>
            <p className="mt-2 font-mono text-2xl tnum">
              {monetization ? money(monetization.estimatedCreatorRoyalties) : "--"} $H
            </p>
          </div>
          <div className="border border-line rounded bg-ink p-3">
            <p className="eyebrow">Culture volume</p>
            <p className="mt-2 font-mono text-2xl text-amber tnum">
              {monetization ? compact(monetization.totalCultureVolume) : "--"} $H
            </p>
          </div>
          <div className="border border-line rounded bg-ink p-3">
            <p className="eyebrow">Top sponsored asset</p>
            {monetization?.topSponsoredAsset ? (
              <Link
                href={`/asset/${monetization.topSponsoredAsset.symbol}`}
                className="mt-2 block font-mono text-amber hover:underline"
              >
                {monetization.topSponsoredAsset.emoji} {monetization.topSponsoredAsset.symbol}
              </Link>
            ) : (
              <p className="mt-2 font-mono text-xl text-mut">None yet</p>
            )}
          </div>
        </div>
        <p className="mt-3 font-mono text-[10px] text-mut">
          Royalty figures are simulated analytics only. No ledger transfers are executed in this sprint.
        </p>
      </section>

      <section className="panel p-5 mb-6">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-center">
          <div>
            <p className="eyebrow">Unlock HYPE Pro</p>
            <h2 className="mt-2 font-display font-semibold text-2xl">
              Advanced cultural intelligence for brands and creators
            </h2>
            <p className="mt-3 text-mut">
              Spot viral momentum before it becomes obvious. Convert live trading behavior into
              campaign timing, creator discovery, market research, and audience demand signals.
            </p>
          </div>
          <div className="border border-line rounded-lg bg-ink p-4 font-mono text-sm">
            <div className="flex justify-between border-b border-line pb-2">
              <span className="text-mut">Pro terminal</span>
              <span className="text-amber">locked</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-mut">
              <p>Creator intelligence feeds</p>
              <p>Brand-fit alerts</p>
              <p>Agency trend dossiers</p>
              <p>Research exports</p>
            </div>
            <button className="btn-amber w-full mt-4" disabled>
              Payments not enabled in demo
            </button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-3">
        {["Creators", "Agencies", "Brands", "Trend researchers"].map((name) => (
          <div key={name} className="panel p-4">
            <p className="font-display font-semibold text-lg">{name}</p>
            <p className="mt-2 text-sm text-mut">
              Use market behavior as early evidence of what culture wants next.
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
