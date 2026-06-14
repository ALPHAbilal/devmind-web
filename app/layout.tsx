import type { Metadata } from "next";
import "./globals.css";

/**
 * Fonts are loaded via a plain <link> tag — same as the source HTML demos.
 * We intentionally avoid `next/font/google` because it fetches the font
 * stylesheet at build time, which can fail in restricted networks and would
 * also rewrite the font-family names away from the verbatim strings the
 * demos use ("Instrument Serif", "DM Sans"). The demos are the spec; match
 * them literally.
 *
 * Notebook theme uses system fonts (Segoe UI / Cascadia Code) — no link
 * needed for those.
 */
export const metadata: Metadata = {
  title: "DevMind",
  description: "An AI tutor that learns alongside you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap"
          rel="stylesheet"
        />
        {/* Board surface (/board) — monochrome + holo. Same verbatim-link
            approach: Inter (UI) + JetBrains Mono (code/labels). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
