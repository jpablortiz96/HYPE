"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useSWRConfig } from "swr";

const CATEGORIES = ["meme", "sound", "creator", "challenge", "ai", "sports", "fashion", "other"];
const REGIONS = ["LATAM", "Global", "Colombia", "Mexico", "Argentina", "Brazil", "US Hispanic", "Spain", "Other"];
const SPONSOR_TYPES = ["creator", "brand", "agency", "community"];

const PRESETS = [
  {
    id: "safe",
    name: "Safe launch",
    detail: "Lower base price and gentler slope for community discovery.",
  },
  {
    id: "viral",
    name: "Viral launch",
    detail: "Balanced curve for fast-moving internet signals.",
  },
  {
    id: "premium",
    name: "Premium launch",
    detail: "Higher opening price for campaign-ready cultural assets.",
  },
];

export default function ListPage() {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [category, setCategory] = useState("ai");
  const [region, setRegion] = useState("Global");
  const [emoji, setEmoji] = useState("");
  const [originStory, setOriginStory] = useState("");
  const [curvePreset, setCurvePreset] = useState("viral");
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorType, setSponsorType] = useState("creator");
  const [campaignNote, setCampaignNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<any>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          symbol,
          category,
          region,
          emoji,
          originStory,
          curvePreset,
          isSponsored,
          sponsorName,
          sponsorType,
          campaignNote,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Listing failed.");
        return;
      }
      setCreated(data.asset);
      mutate("/api/market");
      mutate("/api/pro");
    } catch {
      setError("Network error. The listing desk is still online; retry in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Trend IPO desk</p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl">List a Trend</h1>
          <p className="mt-3 max-w-2xl text-mut">
            Launch a cultural asset with zero initial supply and zero reserve. The curve opens
            cleanly; traders decide whether the signal becomes a market.
          </p>
        </div>
        <Link href="/market" className="btn-ghost">
          Back to board
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <form onSubmit={submit} className="panel p-5 space-y-5">
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <label className="block">
              <span className="eyebrow">Trend name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="AI Homework Panic"
                className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper"
              />
            </label>
            <label className="block">
              <span className="eyebrow">Symbol</span>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AIPANIC"
                maxLength={8}
                className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper uppercase"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="eyebrow">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow">Region</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow">Emoji optional</span>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📈"
                maxLength={8}
                className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper"
              />
            </label>
          </div>

          <label className="block">
            <span className="eyebrow">Origin story</span>
            <textarea
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              placeholder="Why might this cultural signal move?"
              rows={4}
              className="mt-1 w-full bg-ink border border-line rounded px-3 py-2 font-mono text-paper"
            />
          </label>

          <div>
            <p className="eyebrow mb-2">Curve preset</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setCurvePreset(p.id)}
                  className={`text-left border rounded p-3 transition ${
                    curvePreset === p.id ? "border-amber bg-amber/10" : "border-line hover:border-amber"
                  }`}
                >
                  <span className="font-mono text-sm text-amber">{p.name}</span>
                  <span className="block mt-1 text-xs text-mut">{p.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-line rounded-lg p-4 bg-ink">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => setIsSponsored(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="eyebrow block">Promote this trend</span>
                <span className="text-sm text-mut">
                  Simulate a future paid placement: featured IPO placement, sponsored cultural
                  market, and campaign-ready asset. No real payments are enabled.
                </span>
              </span>
            </label>
            {isSponsored && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <label className="block">
                  <span className="eyebrow">Sponsor / creator / brand</span>
                  <input
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="HYPE Labs"
                    className="mt-1 w-full bg-panel border border-line rounded px-3 py-2 font-mono text-paper"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Sponsor type</span>
                  <select
                    value={sponsorType}
                    onChange={(e) => setSponsorType(e.target.value)}
                    className="mt-1 w-full bg-panel border border-line rounded px-3 py-2 font-mono text-paper"
                  >
                    {SPONSOR_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="eyebrow">Campaign note</span>
                  <input
                    value={campaignNote}
                    onChange={(e) => setCampaignNote(e.target.value)}
                    placeholder="Campaign-ready signal for back-to-school creators."
                    className="mt-1 w-full bg-panel border border-line rounded px-3 py-2 font-mono text-paper"
                  />
                </label>
              </div>
            )}
          </div>

          <button disabled={busy} className="btn-amber w-full">
            {busy ? "Listing on Aurora DSQL..." : "Launch Trend IPO"}
          </button>
          {error && <p className="font-mono text-sm text-down">{error}</p>}
          {created && (
            <p className="font-mono text-sm text-up">
              Listed {created.symbol}.{" "}
              <Link href={`/asset/${created.symbol}`} className="text-amber hover:underline">
                Open the asset terminal
              </Link>
              .
            </p>
          )}
        </form>

        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="eyebrow">Launch invariant</p>
            <p className="mt-2 font-mono text-xl text-amber tnum">supply 0 / reserve 0</p>
            <p className="mt-2 text-sm text-mut">
              A listed trend starts empty, so reserveAt(base, slope, 0) remains exactly 0.
            </p>
          </div>
          <div className="panel p-4">
            <p className="eyebrow">Monetization path</p>
            <div className="mt-3 space-y-2 font-mono text-sm text-mut">
              <p>Featured IPO placement</p>
              <p>Sponsored cultural market</p>
              <p>Creator campaign surface</p>
              <p>HYPE Pro analytics unlock</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
