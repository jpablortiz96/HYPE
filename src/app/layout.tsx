import type { Metadata } from "next";
import "@fontsource/unbounded/600.css";
import "@fontsource/unbounded/800.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";

export const metadata: Metadata = {
  title: "HYPE — The Culture Exchange",
  description:
    "A planet-scale stock market for culture. Trade memes, sounds and trends with real exchange-grade settlement on Amazon Aurora DSQL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-ink text-paper min-h-screen antialiased">
        <Ticker />
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
        <footer className="border-t border-line py-8">
          <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-mut">
              HYPE · The Culture Exchange — built on Amazon Aurora DSQL + Vercel for the H0 Hackathon.
            </p>
            <p className="font-mono text-xs text-amberdim">
              Play money. Real database guarantees.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
