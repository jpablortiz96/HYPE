"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, money } from "@/lib/fmt";

function slugify(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function statusClass(status: string): string {
  if (status === "Completed") return "text-up";
  if (status === "Heating Up") return "text-amber";
  if (status === "Needs Scouts") return "text-down";
  return "text-paper";
}

export default function CampaignsPage() {
  const { data } = useSWR("/api/campaigns", fetcher, { refreshInterval: 7000 });
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Brand Campaign Missions</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl">Campaigns</h1>
          <p className="mt-3 max-w-2xl text-mut">
            Brands can sponsor cultural markets, creators can launch missions, and scouts can
            compete to move attention before it peaks.
          </p>
        </div>
        <Link href="/list" className="btn-amber">
          Launch IPO
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="panel p-4">
          <p className="eyebrow">Active campaigns</p>
          <p className="mt-2 font-mono text-2xl text-amber tnum">{data?.summary?.activeCampaigns ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Simulated reward pools</p>
          <p className="mt-2 font-mono text-2xl tnum">
            {data?.summary ? money(data.summary.simulatedRewardPools) : "--"} $H
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Sponsored missions</p>
          <p className="mt-2 font-mono text-2xl tnum">{data?.summary?.sponsoredCampaigns ?? 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {campaigns.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel h-64 animate-pulseamber" />)}
        {campaigns.map((c: any) => (
          <article key={c.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="eyebrow">{c.missionType}</p>
                <h2 className="mt-1 font-display font-semibold text-2xl">{c.name}</h2>
              </div>
              <span className={`font-mono text-xs tnum ${statusClass(c.status)}`}>{c.status}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Sponsor</p>
                <Link href={`/profile/${slugify(c.sponsor)}`} className="mt-2 block text-amber hover:underline">
                  {c.sponsor}
                </Link>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Linked asset</p>
                <Link href={`/asset/${c.asset.symbol}`} className="mt-2 block text-amber hover:underline">
                  {c.asset.emoji} {c.asset.symbol}
                </Link>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Simulated reward pool</p>
                <p className="mt-2 text-xl tnum">{money(c.simulatedRewardPool)} $H</p>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Goal</p>
                <p className="mt-2 text-paper">{c.goal}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between font-mono text-xs text-mut mb-1">
                <span>Progress</span>
                <span className="tnum">{c.progress}%</span>
              </div>
              <div className="h-2 rounded bg-ink border border-line overflow-hidden">
                <div className="h-full bg-amber" style={{ width: `${c.progress}%` }} />
              </div>
            </div>

            <p className="mt-4 text-sm text-mut">{c.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/asset/${c.asset.symbol}`} className="btn-ghost">
                View asset
              </Link>
              <button className="btn-ghost" disabled>
                Join mission
              </button>
              <Link href="/pro" className="btn-ghost">
                Track campaign
              </Link>
            </div>
            <p className="mt-3 font-mono text-[10px] text-mut">
              Rewards are simulated analytics only. No balances or reserves move.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
