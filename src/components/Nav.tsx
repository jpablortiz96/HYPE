"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher, money } from "@/lib/fmt";

const LINKS = [
  { href: "/market", label: "Market" },
  { href: "/list", label: "List" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/leagues", label: "Leagues" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pro", label: "Pro" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/ledger", label: "Ledger" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });
  const user = data?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-lg font-extrabold tracking-tight text-amber">
            HYPE
          </span>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.25em] text-mut">
            The Culture Exchange
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-mono text-xs sm:text-sm px-2.5 py-1.5 rounded transition whitespace-nowrap ${
                  active ? "text-ink bg-amber" : "text-mut hover:text-amber"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <span className="hidden md:inline font-mono text-xs text-mut">
                @{user.username}
              </span>
              <span className="font-mono text-xs sm:text-sm text-amber tnum">
                {money(user.cash)} <span className="text-amberdim">$H</span>
              </span>
            </>
          ) : (
            <span className="font-mono text-xs text-mut animate-pulseamber">
              opening account…
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
