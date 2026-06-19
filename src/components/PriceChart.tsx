"use client";

export default function PriceChart({ series }: { series: { t: string; p: number }[] }) {
  const W = 720;
  const H = 240;
  const PAD = { top: 12, right: 56, bottom: 22, left: 8 };

  if (!series || series.length < 2) {
    return (
      <div className="panel h-[240px] flex items-center justify-center">
        <span className="font-mono text-xs text-mut">No trades yet — be the first print.</span>
      </div>
    );
  }

  const prices = series.map((s) => s.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || max * 0.1 || 1;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const xy = (i: number, p: number): [number, number] => [
    PAD.left + (iw * i) / (series.length - 1),
    PAD.top + ih * (1 - (p - min) / span),
  ];

  const line = series
    .map((s, i) => {
      const [x, y] = xy(i, s.p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const [x0] = xy(0, series[0].p);
  const [xn] = xy(series.length - 1, series[series.length - 1].p);
  const area = `${line} L${xn.toFixed(1)},${PAD.top + ih} L${x0.toFixed(1)},${PAD.top + ih} Z`;

  const last = series[series.length - 1].p;
  const [, lastY] = xy(series.length - 1, last);
  const gridLevels = [min, min + span / 2, max];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto panel"
      role="img"
      aria-label="Price history"
    >
      <defs>
        <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB300" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FFB300" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLevels.map((g, i) => {
        const y = PAD.top + ih * (1 - (g - min) / span);
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1E2532" strokeWidth="1" />
            <text x={W - PAD.right + 6} y={y + 3.5} fill="#8B93A3" fontSize="10" fontFamily="IBM Plex Mono, monospace">
              {g.toFixed(2)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#amberFill)" />
      <path d={line} fill="none" stroke="#FFB300" strokeWidth="2" />
      <circle cx={xn} cy={lastY} r="3.5" fill="#FFB300">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x={xn - 4} y={lastY - 8} textAnchor="end" fill="#FFB300" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        {last.toFixed(2)} $H
      </text>
    </svg>
  );
}
