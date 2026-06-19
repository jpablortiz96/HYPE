/**
 * HYPE integer bonding curve — the heart of the exchange.
 *
 * Every monetary value is stored as an integer number of MICRO units
 * (1 $H = 1,000,000 micro). Shares are whole integers. All math is BigInt.
 * Result: the solvency invariant holds EXACTLY (==), not approximately.
 *
 * Spot price at supply s:        P(s) = base + slope * s
 * Cost of buying q shares:       sum_{i=0..q-1} P(s+i)
 *                                = q*base + slope*(s*q + q*(q-1)/2)
 * Proceeds of selling q shares:  sum_{i=1..q}  P(s-i)
 *                                = q*base + slope*(s*q - q*(q+1)/2)
 * Reserve locked at supply s:    R(s) = s*base + slope*s*(s-1)/2
 *
 * Round-trip of 1 share is exactly 0 (before fees), so:
 *   Σ user cash + Σ asset reserve === Σ minted   — always, to the micro.
 */

export const MICRO = 1_000_000n;
export const SELL_FEE_BPS = 100n; // 1% exchange fee on sells -> treasury (revenue)

export function spotPrice(base: bigint, slope: bigint, supply: bigint): bigint {
  return base + slope * supply;
}

export function buyCost(base: bigint, slope: bigint, supply: bigint, qty: bigint): bigint {
  if (qty <= 0n) throw new Error("qty must be > 0");
  return qty * base + slope * (supply * qty + (qty * (qty - 1n)) / 2n);
}

export function sellProceeds(base: bigint, slope: bigint, supply: bigint, qty: bigint): bigint {
  if (qty <= 0n) throw new Error("qty must be > 0");
  if (qty > supply) throw new Error("qty exceeds supply");
  return qty * base + slope * (supply * qty - (qty * (qty + 1n)) / 2n);
}

export function sellFee(proceeds: bigint): bigint {
  return (proceeds * SELL_FEE_BPS) / 10_000n;
}

/** Closed-form reserve the curve says must be locked at a given supply. */
export function reserveAt(base: bigint, slope: bigint, supply: bigint): bigint {
  return supply * base + (slope * supply * (supply - 1n)) / 2n;
}

export function microToFloat(v: bigint | string): number {
  const b = typeof v === "string" ? BigInt(v) : v;
  return Number(b) / 1_000_000;
}

export function floatLabel(v: bigint | string, digits = 2): string {
  return microToFloat(v).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
