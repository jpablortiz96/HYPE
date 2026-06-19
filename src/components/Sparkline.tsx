"use client";

import { useId } from "react";

export default function Sparkline({
  points,
  width = 110,
  height = 30,
  up,
}: {
  points: number[];
  width?: number;
  height?: number;
  up: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  if (!points || points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="rounded border border-line/60 bg-ink/60 opacity-50"
      />
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || Math.max(max * 0.08, 1);
  const padX = 2;
  const padY = 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const xy = points.map((p, i) => ({
    x: padX + (innerW * i) / (points.length - 1),
    y: padY + innerH * (1 - (p - min) / span),
  }));
  const d = xy
    .map((pt, i) => {
      if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      const prev = xy[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `Q${cx.toFixed(1)},${prev.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");
  const last = xy[xy.length - 1];
  const first = xy[0];
  const area = `${d} L${last.x.toFixed(1)},${(height - padY).toFixed(1)} L${first.x.toFixed(1)},${(height - padY).toFixed(1)} Z`;
  const color = up ? "#2CE08B" : "#FF4D6D";
  const dim = up ? "rgba(44,224,139,0.18)" : "rgba(255,77,109,0.18)";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gradientId}-spark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        x2={width - padX}
        y1={height - padY}
        y2={height - padY}
        stroke="#1E2532"
        strokeWidth="1"
      />
      <path d={area} fill={`url(#${gradientId}-spark)`} />
      <path d={d} fill="none" stroke={dim} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.2" fill={color} />
    </svg>
  );
}
