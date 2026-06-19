import { q } from "./db";

let treasuryId: string | null = null;

/** The exchange treasury account collects the 1% sell fee — HYPE's revenue. */
export async function getTreasuryId(): Promise<string> {
  if (treasuryId) return treasuryId;
  const rows = await q<{ id: string }>(
    "SELECT id FROM users WHERE username = 'HYPE_TREASURY' AND is_bot = true"
  );
  if (rows.length === 0) {
    throw new Error("Treasury account missing — run `npm run db:seed` first.");
  }
  treasuryId = rows[0].id;
  return treasuryId;
}
