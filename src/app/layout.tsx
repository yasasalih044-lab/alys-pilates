import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Cormorant, Manrope } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const serif = Cormorant({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: `${site.brand.name} | ${site.brand.role} · ${site.location.district}`,
  description: site.brand.tagline,
  icons: { icon: site.brand.logo },
};

export const viewport: Viewport = {
  themeColor: site.theme.bg,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = site.theme;
  // Accent picked by the studio → buttons in that colour; otherwise white.
  const cta = t.accent || "#fafafa";
  const ctaInk = luminance(cta) > 0.45 ? "#111111" : "#ffffff";
  const vars = {
    "--bg": t.bg,
    "--surface": t.surface,
    "--ink": t.ink,
    "--muted": t.muted,
    "--line": t.line,
    "--accent": t.accent || "#fafafa",
    "--cta": cta,
    "--cta-ink": ctaInk,
  } as CSSProperties;

  return (
    <html lang="tr" style={vars} className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}

/** Relative luminance (0–1) of a #rrggbb colour. */
function luminance(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
