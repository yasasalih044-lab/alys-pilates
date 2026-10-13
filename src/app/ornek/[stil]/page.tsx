import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SitePage from "@/components/site/site-page";
import { PreviewBar } from "@/components/site/preview-bar";
import { OrnekRibbon } from "@/components/site/ornek-ribbon";
import { SITE_STYLES, isSiteStyle } from "@/lib/styles";
import type { Site } from "@/lib/site";
import ornek from "@/data/ornek.json";
import "@/app/ornek.css";

export const dynamic = "force-dynamic";

/** Example studio shown in each style from the form's "Önizle" link. Not a real studio, never indexed. */
const ORNEK = ornek as Site;
/** Light variant (?tema=acik): Reformer Dijital magenta on white — silk background and glass cards. */
const LIGHT: Site["theme"] = { bg: "#ffffff", surface: "#ffffff", ink: "#1c0d18", muted: "#76626f", line: "#eadbe5", accent: "#ff00ff", ctaInk: "#ffffff", mode: "light", photos: "color" };

type Props = { params: Promise<{ stil: string }>; searchParams: Promise<{ tema?: string | string[] }> };

const nameOf = (stil: string) => SITE_STYLES.find((o) => o.key === stil)?.name ?? stil;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stil } = await params;
  if (!isSiteStyle(stil)) return { title: "Bulunamadı", robots: { index: false, follow: false } };
  return {
    title: `Örnek site · ${nameOf(stil)} | Site Yapıcı`,
    description: "Site Yapıcı ile oluşturulan sitelerin bu tarzdaki örneği.",
    robots: { index: false, follow: false },
    icons: { icon: "/demo/rd-icon.png" },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { stil } = await params;
  if (!isSiteStyle(stil)) notFound();
  const acik = (await searchParams).tema === "acik";
  const s: Site = { ...ORNEK, style: stil, theme: acik ? LIGHT : ORNEK.theme };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/ornek/${stil}`;
  const name = nameOf(stil);

  return (
    <SitePage s={s} top={<OrnekRibbon stil={stil} acik={acik} />}>
      <PreviewBar
        url={url}
        studio={s.brand.name}
        label={
          <>
            <strong>Örnek site</strong> · <span>{name} tarzı</span>
          </>
        }
        cta="Bu tarzda site istiyorum"
        message={`Merhaba, internet sitemi istiyorum, ${name} tarzında olsun: ${url}`}
      />
    </SitePage>
  );
}
