"use client";

import useSWR from "swr";
import { fetcher, money } from "@/lib/fmt";

export default function LedgerPage() {
  const { data } = useSWR("/api/integrity", fetcher, { refreshInterval: 2000 });

  const ok = data ? data.ledgerBalanced && data.curveConsistent : null;

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <p className="eyebrow">Live audit · re-checked every 2 seconds · whole exchange</p>
      <h1 className="font-display font-extrabold text-3xl mb-2">Proof of Solvency</h1>
      <p className="text-mut mb-8">
        Every $H on this exchange is an integer count of micro-units. That makes the accounting a
        theorem instead of an approximation: the cash in every wallet plus the reserve locked in
        every bonding curve must equal every $H ever minted. Exactly. This page recomputes that
        equation against Aurora DSQL on a loop — while bots and traders hammer the engine.
      </p>

      {/* THE EQUATION */}
      <div
        className={`panel p-6 sm:p-8 border-2 transition ${
          ok === null ? "border-line" : ok ? "border-up/60" : "border-down"
        }`}
      >
        {!data ? (
          <p className="font-mono text-sm text-mut animate-pulseamber">auditing the ledger…</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 text-center">
              <div>
                <p className="eyebrow mb-1">Σ user cash</p>
                <p className="font-mono text-xl sm:text-2xl tnum">{money(data.display.totalCash)}</p>
                <p className="font-mono text-[10px] text-mut tnum mt-1">{data.totalCash} micro</p>
              </div>
              <span className="font-display text-2xl text-amberdim">+</span>
              <div>
                <p className="eyebrow mb-1">Σ curve reserves</p>
                <p className="font-mono text-xl sm:text-2xl tnum">{money(data.display.totalReserve)}</p>
                <p className="font-mono text-[10px] text-mut tnum mt-1">{data.totalReserve} micro</p>
              </div>
              <span className="font-display text-2xl text-amberdim">=</span>
              <div>
                <p className="eyebrow mb-1">Σ minted</p>
                <p className="font-mono text-xl sm:text-2xl text-amber tnum">
                  {money(data.display.totalMinted)}
                </p>
                <p className="font-mono text-[10px] text-mut tnum mt-1">{data.totalMinted} micro</p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full animate-pulseamber ${
                    ok ? "bg-up" : "bg-down"
                  }`}
                />
                <span className={`font-mono text-sm ${ok ? "text-up" : "text-down"}`}>
                  {ok ? "SOLVENT — drift: 0 micro-units" : `BREACH — drift: ${data.driftMicro} micro-units`}
                </span>
              </div>
              <span className="font-mono text-[11px] text-mut">
                audited {new Date(data.checkedAt).toLocaleTimeString("en-US", { hour12: false })} ·{" "}
                {data.trades.toLocaleString()} trades · {data.users} accounts
              </span>
            </div>
          </>
        )}
      </div>

      {/* SECOND INVARIANT */}
      <div className="mt-4 panel p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-1">Invariant 2 · curve consistency</p>
            <p className="text-sm text-mut">
              Each asset&apos;s stored reserve must equal the closed-form value R(s) = s·base +
              slope·s(s−1)/2 implied by its supply.
            </p>
          </div>
          {data && (
            <span
              className={`font-mono text-sm ${data.curveConsistent ? "text-up" : "text-down"}`}
            >
              {data.curveConsistent
                ? `HOLDS for all ${data.assetsChecked} assets`
                : "VIOLATED"}
            </span>
          )}
        </div>
      </div>

      {/* WHY IT MATTERS */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="panel p-5">
          <p className="eyebrow mb-2">Why this is hard</p>
          <p className="text-sm text-mut">
            Hundreds of trades can settle in the same instant, all mutating shared rows: wallets,
            supplies, reserves. With a normal eventually-consistent stack, money leaks — a few
            cents of drift per thousand trades. Here, Aurora DSQL&apos;s optimistic concurrency
            control rejects every conflicting commit, the engine retries it, and the invariant
            survives untouched.
          </p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow mb-2">Try to break it</p>
          <p className="text-sm text-mut">
            Run <span className="font-mono text-amber">npm run sim:pump</span> against this
            database: 200 concurrent trades from 24 bots in seconds. Keep this page open. The
            drift counter stays at zero — that&apos;s the whole demo.
          </p>
        </div>
      </div>
    </div>
  );
}
