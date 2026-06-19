"use client";

import { money } from "@/lib/fmt";

export default function PriceChart({ series }: { series: { t: string; p: number }[] }) {
  const W = 920;
  const H = 360;
  const PAD = { top: 28, right: 76, bottom: 42, left: 46 };

  if (!series || series.length < 2) {
    return (
      <div className="panel h-[360px] flex items-center justify-center">
        <span className="font-mono text-xs text-mut">No trades yet - be the first print.</span>
      </div>
    );
  }

  const prices = series.map((s) => s.p);
  const minRaw = Math.min(...prices);
  const maxRaw = Math.max(...prices);
  const padPrice = (maxRaw - minRaw || Math.max(maxRaw * 0.08, 1)) * 0.12;
  const min = minRaw - padPrice;
  const max = maxRaw + padPrice;
  const span = max - min || 1;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const xy = (i: number, p: number): [number, number] => [
    PAD.left + (iw * i) / (series.length - 1),
    PAD.top + ih * (1 - (p - min) / span),
  ];

  const points = series.map((s, i) => {
    const [x, y] = xy(i, s.p);
    return { x, y, p: s.p, t: s.t };
  });

  const line = points
    .map((pt, i) => {
      if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      const prev = points[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `Q${cx.toFixed(1)},${prev.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${PAD.top + ih} L${first.x.toFixed(1)},${PAD.top + ih} Z`;
  const change = first.p > 0 ? ((last.p - first.p) / first.p) * 100 : 0;
  const up = change >= 0;
  const color = up ? "#2CE08B" : "#FF4D6D";
  const priceLevels = [0, 0.25, 0.5, 0.75, 1].map((n) => min + span * n);
  const timeMarks = [0, 0.33, 0.66, 1].map((n) => Math.min(series.length - 1, Math.round((series.length - 1) * n)));
  const [, lastY] = xy(series.length - 1, last.p);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="eyebrow">Live curve chart</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3 font-mono">
            <span className="text-xl text-amber tnum">{money(last.p)} $H</span>
            <span className={`text-sm tnum ${up ? "text-up" : "text-down"}`}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
            <span className="text-xs text-mut">
              {new Date(last.t).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="flex rounded border border-line bg-ink p-1 font-mono text-[11px]">
          {["1H", "24H", "7D", "ALL"].map((r) => (
            <span key={r} className={`px-2.5 py-1 rounded ${r === "ALL" ? "bg-amber text-ink" : "text-mut"}`}>
              {r}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-panel" role="img" aria-label="Price history">
        <defs>
          <linearGradient id="priceFillPremium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="60%" stopColor="#FFB300" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFB300" stopOpacity="0" />
          </linearGradient>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={PAD.left} y={PAD.top} width={iw} height={ih} fill="#0B0E13" opacity="0.55" />

        {priceLevels.map((g, i) => {
          const y = PAD.top + ih * (1 - (g - min) / span);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1E2532" strokeWidth="1" />
              <text x={W - PAD.right + 10} y={y + 4} fill="#8B93A3" fontSize="11" fontFamily="IBM Plex Mono, monospace">
                {money(g)}
              </text>
            </g>
          );
        })}

        {timeMarks.map((idx) => {
          const [x] = xy(idx, series[idx].p);
          return (
            <g key={idx}>
              <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + ih} stroke="#1E2532" strokeWidth="1" opacity="0.65" />
              <text x={x} y={H - 16} fill="#8B93A3" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace">
                {new Date(series[idx].t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#priceFillPremium)" />
        <path d={line} fill="none" stroke={color} strokeWidth="5" opacity="0.16" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line} fill="none" stroke="#FFB300" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" />

        <line x1={PAD.left} x2={W - PAD.right} y1={lastY} y2={lastY} stroke="#FFB300" strokeWidth="1" strokeDasharray="3 4" opacity="0.9" />
        <circle cx={last.x} cy={last.y} r="4" fill="#FFB300" stroke="#0B0E13" strokeWidth="2" />
        <g transform={`translate(${W - PAD.right + 8},${lastY - 12})`}>
          <rect width="62" height="24" rx="3" fill="#FFB300" />
          <text x="31" y="16" fill="#0B0E13" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace">
            {money(last.p)}
          </text>
        </g>

        <text x={PAD.left} y={20} fill="#FFB300" fontSize="11" fontFamily="IBM Plex Mono, monospace" letterSpacing="3">
          PRICE / CURVE SPOT
        </text>
      </svg>
    </div>
  );
}
