"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import Sparkline from "@/components/Sparkline";
import IntegrityBadge from "@/components/IntegrityBadge";
import { fetcher, money, compact, pct, trendClass } from "@/lib/fmt";

const FILTERS = ["All", "Sponsored", "New IPOs", "Hot", "Memes", "Sounds", "AI", "Sports", "Fashion"];

function categoryOf(a: any): string {
  return String(a.category ?? "").toLowerCase();
}

function isNewIpo(a: any): boolean {
  return Number(a.supply ?? 0) === 0 || Number(a.reserve ?? 0) === 0;
}

function isHot(a: any): boolean {
  return (
    Math.abs(Number(a.change24h ?? 0)) >= 12 ||
    Number(a.trades24h ?? 0) >= 20 ||
    Number(a.volume24h ?? 0) >= 750
  );
}

function matchesFilter(a: any, filter: string): boolean {
  const category = categoryOf(a);
  if (filter === "All") return true;
  if (filter === "Sponsored") return !!a.sponsorship;
  if (filter === "New IPOs") return isNewIpo(a);
  if (filter === "Hot") return isHot(a);
  if (filter === "Memes") return category.includes("meme");
  if (filter === "Sounds") return category.includes("sound");
  if (filter === "AI") return category.includes("ai") || String(a.symbol ?? "").includes("AI");
  if (filter === "Sports") return category.includes("sport");
  if (filter === "Fashion") return category.includes("fashion");
  return true;
}

function Badge({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "up" | "down" | "mut";
}) {
  const cls =
    tone === "up"
      ? "border-up/40 bg-up/10 text-up"
      : tone === "down"
        ? "border-down/40 bg-down/10 text-down"
        : tone === "mut"
          ? "border-line bg-panel2 text-mut"
          : "border-amber/40 bg-amber/10 text-amber";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function badgesFor(a: any): Array<{ label: string; tone?: "amber" | "up" | "down" | "mut" }> {
  const badges: Array<{ label: string; tone?: "amber" | "up" | "down" | "mut" }> = [];
  if (a.sponsorship) badges.push({ label: "Sponsored", tone: "amber" });
  if (isNewIpo(a)) badges.push({ label: "New IPO", tone: "mut" });
  if (isHot(a)) badges.push({ label: "Hot", tone: "up" });
  if (a.sponsorship) badges.push({ label: "Campaign-ready", tone: "amber" });
  if (Number(a.volume24h ?? 0) > 0 || Math.abs(Number(a.change24h ?? 0)) >= 8) {
    badges.push({ label: "Pro signal", tone: "mut" });
  }
  if (Number(a.trades24h ?? 0) >= 8) badges.push({ label: "League asset", tone: "up" });
  return badges.slice(0, 3);
}

export default function MarketPage() {
  const [filter, setFilter] = useState("All");
  const { data } = useSWR("/api/market", fetcher, { refreshInterval: 4000 });
  const assets = data?.assets ?? [];
  const sponsored = assets.filter((a: any) => a.sponsorship).slice(0, 3);
  const filtered = useMemo(() => assets.filter((a: any) => matchesFilter(a, filter)), [assets, filter]);

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow">Listed assets · cultural order flow</p>
          <h1 className="font-display font-extrabold text-3xl">The Board</h1>
          <p className="mt-2 text-sm text-mut max-w-2xl">
            Live curve prices, campaign signals, and cultural liquidity in one terminal.
          </p>
        </div>
        <IntegrityBadge />
      </div>

      {sponsored.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {sponsored.map((a: any) => (
            <Link
              key={a.symbol}
              href={`/asset/${a.symbol}`}
              className="panel p-4 block hover:border-amber transition bg-gradient-to-br from-amber/10 via-panel to-panel"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Sponsored IPO</span>
                <Badge>Campaign-ready</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="font-mono text-lg text-amber">
                  {a.emoji} {a.symbol}
                </div>
                <div className={`font-mono text-xs tnum ${trendClass(a.change24h)}`}>
                  {pct(a.change24h)}
                </div>
              </div>
              <p className="text-sm text-mut">{a.name}</p>
              <p className="mt-2 font-mono text-xs text-amberdim truncate">
                {a.sponsorship.sponsorName ?? "Promoted cultural market"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded border px-3 py-1.5 font-mono text-xs transition ${
              filter === f
                ? "border-amber bg-amber text-ink"
                : "border-line bg-panel text-mut hover:border-amber hover:text-amber"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-mut tnum">
          {filtered.length}/{assets.length} signals
        </span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[920px] font-mono text-sm">
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
            {filtered.length === 0 && assets.length > 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-mut">
                  No signals match this filter yet.
                </td>
              </tr>
            )}
            {filtered.map((a: any) => (
              <tr key={a.symbol} className="border-b border-line/50 hover:bg-panel2/80 transition">
                <td className="px-4 py-4">
                  <Link href={`/asset/${a.symbol}`} className="flex items-center gap-3 group">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-ink text-lg">
                      {a.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-amber group-hover:underline">{a.symbol}</span>
                        {badgesFor(a).map((b) => (
                          <Badge key={b.label} tone={b.tone}>
                            {b.label}
                          </Badge>
                        ))}
                      </span>
                      <span className="block text-xs text-mut font-sans truncate max-w-[22rem]">
                        {a.name} · {a.region} · {a.category ?? "trend"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4 text-right tnum text-paper">{money(a.price)}</td>
                <td className={`px-4 py-4 text-right tnum ${trendClass(a.change24h)}`}>
                  {pct(a.change24h)}
                </td>
                <td className="px-4 py-4 text-right tnum text-mut">{compact(a.volume24h)}</td>
                <td className="px-4 py-4 text-right tnum text-mut">{a.supply.toLocaleString()}</td>
                <td className="px-4 py-4 text-right tnum text-mut">{compact(a.reserve)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Sparkline points={a.spark} up={(a.change24h ?? 0) >= 0} width={116} height={34} />
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
