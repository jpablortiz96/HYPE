import { NextResponse } from "next/server";
import { getSessionUser, getOrCreateUser } from "@/lib/session";
import { q } from "@/lib/db";
import { microToFloat } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getOrCreateUser();
  return NextResponse.json({
    user: { id: user.id, username: user.username, cash: microToFloat(user.cash), cashRaw: user.cash },
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No session." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Handle must be 3–24 chars: letters, numbers, underscore." }, { status: 400 });
  }
  await q("UPDATE users SET username = $1 WHERE id = $2", [username, user.id]);
  return NextResponse.json({ ok: true, username });
}
