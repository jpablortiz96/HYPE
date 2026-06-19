"use client";

import Link from "next/link";
import useSWR from "swr";
import MarketDepth from "@/components/MarketDepth";
import TradingChart from "@/components/TradingChart";
import TradePanel from "@/components/TradePanel";
import { fetcher, money, pct, trendClass } from "@/lib/fmt";

export default function AssetView({ symbol }: { symbol: string }) {
  const { data, mutate } = useSWR(`/api/asset/${symbol}`, fetcher, { refreshInterval: 4000 });
  const { data: meData } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });

  if (data?.error) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-2xl mb-2">Unknown ticker: {symbol}</p>
        <Link href="/market" className="font-mono text-amber hover:underline text-sm">
          ← back to the board
        </Link>
      </div>
    );
  }

  const a = data?.asset;
  const cash = meData?.user?.cash ?? 0;

  if (!a) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-10 w-64 bg-panel rounded animate-pulseamber" />
        <div className="h-[240px] bg-panel rounded animate-pulseamber" />
      </div>
    );
  }

  const positionQty = data.position?.qty ?? 0;
  const first = data.series?.[0]?.p;
  const sessionChange =
    first && first > 0 ? ((a.price - first) / first) * 100 : null;

  return (
    <div className="py-8">
      <Link href="/market" className="font-mono text-xs text-amberdim hover:text-amber">
        ← board
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">
            {a.category} · {a.region}
          </p>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl">
            {a.emoji} {a.symbol}
            <span className="ml-3 font-sans font-normal text-lg text-mut">{a.name}</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl text-amber tnum">{money(a.price)} $H</div>
          <div className={`font-mono text-sm tnum ${trendClass(sessionChange)}`}>
            {pct(sessionChange)} <span className="text-mut">window</span>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_350px] gap-5">
        <div className="space-y-4 min-w-0">
          <TradingChart
            symbol={a.symbol}
            series={data.series ?? []}
            recentTrades={data.recentTrades ?? []}
          />

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="panel p-3">
              <p className="eyebrow">Supply</p>
              <p className="font-mono text-lg tnum">{a.supply.toLocaleString()}</p>
            </div>
            <div className="panel p-3">
              <p className="eyebrow">Curve reserve</p>
              <p className="font-mono text-lg tnum">{money(a.reserve)} $H</p>
            </div>
            <div className="panel p-3">
              <p className="eyebrow">Base price</p>
              <p className="font-mono text-lg tnum">{money(a.basePrice)} $H</p>
            </div>
          </div>

          <MarketDepth raw={a.raw} />

          <div className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="eyebrow">Creator Revenue Engine</p>
                <h2 className="font-display font-semibold text-xl mt-1">Royalty Simulation</h2>
              </div>
              <span className="font-mono text-[10px] text-amberdim">simulated, not paid</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 font-mono text-sm">
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Total volume</p>
                <p className="mt-2 text-xl text-amber tnum">{money(a.royaltySimulation.totalVolume)} $H</p>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Creator royalty at 1%</p>
                <p className="mt-2 text-xl tnum">{money(a.royaltySimulation.simulatedCreatorRoyalty)} $H</p>
              </div>
              <div className="border border-line rounded bg-ink p-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim">Estimated campaign value</p>
                <p className="mt-2 text-xl tnum">{money(a.royaltySimulation.estimatedCampaignValue)} $H</p>
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 font-mono text-xs text-mut">
              <div className="flex justify-between border border-line rounded bg-ink p-3">
                <span>Trades</span>
                <span className="tnum text-paper">{a.royaltySimulation.tradeCount}</span>
              </div>
              <div className="flex justify-between border border-line rounded bg-ink p-3">
                <span>Active traders</span>
                <span className="tnum text-paper">{a.royaltySimulation.activeTraders}</span>
              </div>
              <div className="flex justify-between border border-line rounded bg-ink p-3">
                <span>Holders</span>
                <span className="tnum text-paper">{a.royaltySimulation.holders}</span>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] text-mut">
              Estimated only. This sprint does not move money, touch reserves, debit users, or pay treasury.
            </p>
          </div>

          <div className="panel">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <span className="eyebrow">Recent prints</span>
              <span className="font-mono text-[10px] text-mut">latest 24</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full font-mono text-xs">
                <tbody>
                  {(data.recentTrades ?? []).map((t: any, i: number) => (
                    <tr key={i} className="border-b border-line/40">
                      <td className={`px-4 py-2 ${t.side === "BUY" ? "text-up" : "text-down"}`}>
                        {t.side}
                      </td>
                      <td className="px-4 py-2 text-right tnum">{t.qty}</td>
                      <td className="px-4 py-2 text-right tnum text-paper">@ {money(t.price)}</td>
                      <td className="px-4 py-2 text-right tnum text-mut">{money(t.total)} $H</td>
                      <td className="px-4 py-2 text-right text-mut">
                        {new Date(t.at).toLocaleTimeString("en-US", { hour12: false })}
                      </td>
                    </tr>
                  ))}
                  {(data.recentTrades ?? []).length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-mut" colSpan={5}>
                        No prints yet. The first trade sets the tape.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <TradePanel
            symbol={a.symbol}
            raw={a.raw}
            positionQty={positionQty}
            cash={cash}
            onTraded={() => mutate()}
          />
          {a.sponsorship && (
            <div className="panel p-4 font-mono text-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Sponsored IPO</p>
                <span className="text-[10px] text-ink bg-amber px-2 py-0.5 rounded">Campaign-ready</span>
              </div>
              <div>
                <p className="text-mut text-xs">Sponsor</p>
                <p className="text-amber tnum">{a.sponsorship.sponsorName}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Type</span>
                <span className="text-paper">{a.sponsorship.sponsorType}</span>
              </div>
              {a.sponsorship.campaignNote && (
                <p className="text-xs text-mut">{a.sponsorship.campaignNote}</p>
              )}
              <div className="border-t border-line pt-3">
                <p className="text-[10px] uppercase tracking-widest text-amberdim mb-2">
                  Suggested monetization
                </p>
                <div className="space-y-1 text-xs text-mut">
                  {a.sponsorship.suggestedMonetization.map((item: string) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {data.position && (
            <div className="panel p-4 font-mono text-sm space-y-1">
              <p className="eyebrow mb-1">Your position</p>
              <div className="flex justify-between">
                <span className="text-mut">Shares</span>
                <span className="tnum">{data.position.qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Total cost basis</span>
                <span className="tnum">{money(data.position.costBasis)} $H</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
