import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";
import { executeTrade, TradeError } from "@/lib/engine";
import { getTreasuryId } from "@/lib/meta";
import { microToFloat } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").toUpperCase();
  const side = body.side === "SELL" ? "SELL" : "BUY";
  const qty = Number(body.qty);

  try {
    const user = await getOrCreateUser();
    const treasuryId = await getTreasuryId();
    const r = await executeTrade(user.id, symbol, side, qty, treasuryId);
    return NextResponse.json({
      ok: true,
      trade: {
        side: r.side,
        qty: Number(r.qty),
        total: microToFloat(r.total),
        fee: microToFloat(r.fee),
        avgPrice: microToFloat(r.avgPrice),
        newPrice: microToFloat(r.newPrice),
        cashAfter: microToFloat(r.cashAfter),
        occRetries: r.retries,
      },
    });
  } catch (e: any) {
    if (e instanceof TradeError) {
      return NextResponse.json({ ok: false, code: e.code, error: e.message }, { status: 400 });
    }
    console.error("trade failed:", e);
    return NextResponse.json({ ok: false, error: "Settlement failed. Try again." }, { status: 500 });
  }
}
