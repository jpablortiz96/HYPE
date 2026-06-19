import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await getOrCreateUser();
  return NextResponse.json({ user });
}
