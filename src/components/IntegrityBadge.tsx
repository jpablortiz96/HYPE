"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fmt";

export default function IntegrityBadge({ refreshMs = 6000 }: { refreshMs?: number }) {
  const { data } = useSWR("/api/integrity", fetcher, { refreshInterval: refreshMs });

  if (!data) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-xs text-mut border border-line rounded px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-mut animate-pulseamber" />
        auditing ledger…
      </span>
    );
  }

  const ok = data.ledgerBalanced && data.curveConsistent;
  return (
    <Link
      href="/ledger"
      className={`inline-flex items-center gap-2 font-mono text-xs rounded px-3 py-1.5 border transition hover:brightness-110 ${
        ok ? "border-up/50 text-up bg-up/10" : "border-down text-down bg-down/10"
      }`}
      title="Open the live solvency audit"
    >
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-up" : "bg-down"} animate-pulseamber`} />
      {ok ? "PROOF OF SOLVENCY · drift 0 micro" : `SOLVENCY BREACH · drift ${data.driftMicro} micro`}
    </Link>
  );
}
