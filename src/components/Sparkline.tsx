"use client";

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
  if (!points || points.length < 2) {
    return <div style={{ width, height }} className="opacity-30 border-b border-line" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const pad = 2;
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = pad + (height - pad * 2) * (1 - (p - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = up ? "#2CE08B" : "#FF4D6D";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
