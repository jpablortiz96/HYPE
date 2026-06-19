import { NextResponse } from "next/server";
import { checkIntegrity } from "@/lib/integrity";
import { microToFloat } from "@/lib/curve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const r = await checkIntegrity();
  return NextResponse.json({
    ...r,
    display: {
      totalCash: microToFloat(r.totalCash),
      totalReserve: microToFloat(r.totalReserve),
      totalMinted: microToFloat(r.totalMinted),
    },
  });
}
