import type { Metadata } from "next";
import "./fonts.css";

// Fonts are self-hosted in fonts.css (Manrope + italic Cormorant for the sites,
// Nunito for Site Yapıcı, plus the style presets' display faces).

export const metadata: Metadata = {
  title: "Site Yapıcı | Reformer Dijital",
  description: "Reformer pilates stüdyon için siteni yap, tek tıkla yayınla. İlk 1 ay ücretsiz.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head>
        {/* The two faces every site uses first: Manrope (latin + Turkish letters). */}
        <link rel="preload" href="/fonts/manrope-normal-400-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/manrope-normal-400-latin-ext.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
