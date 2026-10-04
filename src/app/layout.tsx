import type { Metadata } from "next";
import { Cormorant, Manrope, Nunito } from "next/font/google";

// Site template fonts (Manrope + italic Cormorant) and the Site Yapıcı font (Nunito).
const sans = Manrope({ variable: "--font-sans", subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const serif = Cormorant({ variable: "--font-serif", subsets: ["latin", "latin-ext"], weight: ["400"], style: ["italic"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"], weight: ["700", "800", "900"] });

export const metadata: Metadata = {
  title: "Site Yapıcı | Reformer Dijital",
  description: "Reformer pilates stüdyon için siteni yap, tek tıkla yayınla. İlk 1 ay ücretsiz.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${sans.variable} ${serif.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
