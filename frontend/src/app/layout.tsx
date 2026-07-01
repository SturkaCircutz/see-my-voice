import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "See My Voice",
  description: "Mandarin pronunciation practice with account-backed progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="min-w-80 bg-[#ece8df] [color-scheme:light]" lang="zh-CN">
      <body className="min-h-screen min-w-80 overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_38rem),#ece8df] font-[var(--sans)] text-[var(--ink)] antialiased max-sm:bg-[var(--paper)]">
        {children}
      </body>
    </html>
  );
}
