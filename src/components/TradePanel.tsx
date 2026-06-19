"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { buyCost, sellProceeds, sellFee, spotPrice, microToFloat } from "@/lib/curve";
import { money } from "@/lib/fmt";

interface Props {
  symbol: string;
  raw: { base: string; slope: string; supply: string };
  positionQty: number;
  cash: number;
  onTraded?: () => void;
}

type Side = "BUY" | "SELL";

export default function TradePanel({ symbol, raw, positionQty, cash, onTraded }: Props) {
  const { mutate } = useSWRConfig();
  const [side, setSide] = useState<Side>("BUY");
  const [qtyStr, setQtyStr] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const qty = useMemo(() => {
    const n = Math.floor(Number(qtyStr));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [qtyStr]);

  const preview = useMemo(() => {
    if (qty <= 0 || qty > 100_000) return null;
    try {
      const base = BigInt(raw.base);
      const slope = BigInt(raw.slope);
      const supply = BigInt(raw.supply);
      const q = BigInt(qty);
      if (side === "BUY") {
        const cost = buyCost(base, slope, supply, q);
        return {
          label: "You pay",
          amount: microToFloat(cost),
          fee: 0,
          net: microToFloat(cost),
          avgFill: microToFloat(cost / q),
          projectedSpot: microToFloat(spotPrice(base, slope, supply + q)),
        };
      }
      if (q > supply) return null;
      const gross = sellProceeds(base, slope, supply, q);
      const fee = sellFee(gross);
      return {
        label: "You receive",
        amount: microToFloat(gross),
        fee: microToFloat(fee),
        net: microToFloat(gross - fee),
        avgFill: microToFloat(gross / q),
        projectedSpot: microToFloat(spotPrice(base, slope, supply - q)),
      };
    } catch {
      return null;
    }
  }, [qty, side, raw]);

  const blocked =
    qty <= 0 ||
    qty > 100_000 ||
    (side === "SELL" && qty > positionQty) ||
    (side === "BUY" && preview !== null && preview.net > cash);

  async function submit() {
    if (busy || blocked) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, side, qty }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ kind: "err", text: data.error ?? "Settlement failed. Try again." });
      } else {
        const t = data.trade;
        const retries = t.occRetries > 0 ? ` · ${t.occRetries} OCC ${t.occRetries === 1 ? "retry" : "retries"}` : "";
        setMsg({
          kind: "ok",
          text:
            side === "BUY"
              ? `Filled ${t.qty} ${symbol} for ${money(t.total)} $H${retries}`
              : `Sold ${t.qty} ${symbol} for ${money(t.total - t.fee)} $H net${retries}`,
        });
        mutate("/api/me");
        mutate("/api/market");
        onTraded?.();
      }
    } catch {
      setMsg({ kind: "err", text: "Network error. The exchange is still solvent - retry." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Trade desk</span>
          <p className="mt-1 font-mono text-xs text-mut">Exact curve quote · Aurora DSQL settlement</p>
        </div>
        <div className="text-right font-mono text-[11px] text-mut tnum">
          <p>
            held <span className="text-paper">{positionQty}</span>
          </p>
          <p>
            cash <span className="text-amber">{money(cash)} $H</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink p-1">
        {(["BUY", "SELL"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`font-mono text-sm py-2.5 rounded transition ${
              side === s
                ? s === "BUY"
                  ? "bg-up/15 text-up shadow-[inset_0_0_0_1px_rgba(44,224,139,0.55)]"
                  : "bg-down/15 text-down shadow-[inset_0_0_0_1px_rgba(255,77,109,0.55)]"
                : "text-mut hover:text-paper"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="eyebrow">Shares (whole units)</span>
        <div className="mt-1 flex items-center rounded border border-line bg-ink focus-within:border-amber">
          <input
            type="number"
            min={1}
            max={100000}
            step={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            className="w-full bg-transparent px-3 py-3 font-mono text-lg text-paper tnum outline-none"
          />
          <span className="pr-3 font-mono text-xs text-mut">{symbol}</span>
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        {[1, 10, 50, 100, 500].map((n) => (
          <button
            key={n}
            onClick={() => setQtyStr(String(n))}
            className="font-mono text-xs px-2.5 py-1 rounded border border-line bg-ink text-mut hover:border-amber hover:text-amber transition"
          >
            {n}
          </button>
        ))}
        {side === "SELL" && positionQty > 0 && (
          <button
            onClick={() => setQtyStr(String(positionQty))}
            className="font-mono text-xs px-2.5 py-1 rounded border border-line bg-ink text-mut hover:border-amber hover:text-amber transition"
          >
            all {positionQty}
          </button>
        )}
      </div>

      {preview && (
        <div className="border border-line rounded-lg p-3 font-mono text-sm space-y-2 bg-ink">
          <div className="flex justify-between">
            <span className="text-mut">{side === "BUY" ? "Curve cost" : "Curve proceeds"}</span>
            <span className="text-paper tnum">{money(preview.amount)} $H</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mut">Average fill</span>
            <span className="text-paper tnum">{money(preview.avgFill)} $H</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mut">Projected spot</span>
            <span className="text-amber tnum">{money(preview.projectedSpot)} $H</span>
          </div>
          {side === "SELL" && (
            <div className="flex justify-between">
              <span className="text-mut">Exchange fee (1%)</span>
              <span className="text-down tnum">-{money(preview.fee)} $H</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2">
            <span className="text-amberdim">{preview.label}</span>
            <span className="text-amber tnum">{money(preview.net)} $H</span>
          </div>
          <p className="text-[10px] text-mut pt-1">
            Exact to the micro-unit - same integer math the settlement engine runs.
          </p>
        </div>
      )}

      <button onClick={submit} disabled={busy || blocked} className="btn-amber w-full">
        {busy ? "Settling on Aurora DSQL..." : `${side} ${qty || ""} ${symbol}`}
      </button>

      {side === "SELL" && qty > positionQty && (
        <p className="font-mono text-xs text-down">You hold {positionQty} shares - reduce the quantity.</p>
      )}
      {side === "BUY" && preview && preview.net > cash && (
        <p className="font-mono text-xs text-down">Costs {money(preview.net)} $H - you have {money(cash)} $H.</p>
      )}
      {msg && (
        <p
          className={`rounded border px-3 py-2 font-mono text-xs ${
            msg.kind === "ok" ? "border-up/40 bg-up/10 text-up" : "border-down/40 bg-down/10 text-down"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
