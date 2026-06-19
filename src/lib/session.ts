import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { q } from "./db";

const COOKIE = "hype_session";
export const STARTING_CASH = 10_000n * 1_000_000n; // every trader starts with 10,000 $H

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short.");
  return s;
}

function sign(userId: string): string {
  const mac = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

function verify(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = createHmac("sha256", secret()).update(userId).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

const ADJ = ["wired", "loud", "feral", "golden", "turbo", "cosmic", "spicy", "lucid", "vivid", "neon"];
const NOUN = ["capy", "tape", "chisme", "cumbia", "vibes", "drip", "golazo", "mango", "lobo", "nube"];

function guestHandle(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a}_${n}_${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface SessionUser {
  id: string;
  username: string;
  cash: string;
}

/** Returns the logged-in user, or null. Never creates. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const userId = verify(jar.get(COOKIE)?.value);
  if (!userId) return null;
  const rows = await q<SessionUser>("SELECT id, username, cash FROM users WHERE id = $1", [userId]);
  return rows[0] ?? null;
}

/**
 * Instant play: if no valid session exists, mint a guest trader with
 * 10,000 $H and set the cookie. Zero-friction onboarding is part of the
 * million-scale story — no signup wall between a visitor and their first trade.
 */
export async function getOrCreateUser(): Promise<SessionUser> {
  const existing = await getSessionUser();
  if (existing) return existing;
  const id = randomUUID();
  const username = guestHandle();
  await q(
    "INSERT INTO users (id, username, cash, granted, is_bot, created_at) VALUES ($1,$2,$3,$3,false,$4)",
    [id, username, STARTING_CASH.toString(), new Date()]
  );
  const jar = await cookies();
  jar.set(COOKIE, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { id, username, cash: STARTING_CASH.toString() };
}
