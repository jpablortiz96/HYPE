import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Net worth = cash + holdings valued at spot. The whole board is one SQL
  // statement — the database does the math, the app just renders it.
  const rows = await q<{ username: string; cash: string; hv: string; nw: string; created_at: string }>(
    `SELECT u.username,
            u.cash::numeric / 1e6 AS cash,
            COALESCE(SUM(h.qty::numeric * (a.base_price + a.slope * a.supply)::numeric), 0) / 1e6 AS hv,
            (u.cash::numeric + COALESCE(SUM(h.qty::numeric * (a.base_price + a.slope * a.supply)::numeric), 0)) / 1e6 AS nw,
            u.created_at
     FROM users u
     LEFT JOIN holdings h ON h.user_id = u.id
     LEFT JOIN assets a ON a.id = h.asset_id
     WHERE u.is_bot = false
     GROUP BY u.id, u.username, u.cash, u.created_at
     ORDER BY nw DESC
     LIMIT 25`
  );
  return NextResponse.json({
    board: rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      cash: Number(r.cash),
      holdingsValue: Number(r.hv),
      netWorth: Number(r.nw),
      pnlPct: ((Number(r.nw) - 10_000) / 10_000) * 100,
    })),
  });
}
