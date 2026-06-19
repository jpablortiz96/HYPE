/** Client-safe number formatting for the terminal UI. */

export function money(v: number, digits = 2): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return money(v);
}

export function pct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function trendClass(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "text-mut";
  if (v > 0) return "text-up";
  if (v < 0) return "text-down";
  return "text-mut";
}

export const fetcher = (url: string) => fetch(url).then((r) => r.json());
