import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  // Metadata appears in the browser tab and deploy previews.
  title: "See My Voice",
  description: "Mandarin pronunciation practice with account-backed progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The app handles all visible navigation inside the client page.
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
