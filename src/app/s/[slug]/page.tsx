import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SitePage from "@/components/site/site-page";
import { PreviewBar } from "@/components/site/preview-bar";
import { getSite } from "@/lib/store";
import { DEFAULT_STYLE, isSiteStyle } from "@/lib/styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ stil?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSite((await params).slug);
  if (!s) return { title: "Bulunamadı" };
  return {
    title: `${s.brand.name} | ${s.brand.role} · ${s.location.district}`,
    description: s.brand.tagline,
    icons: { icon: s.brand.icon || s.brand.mark || s.brand.logo },
    // Previews are sales drafts, not public pages yet.
    robots: s._meta?.preview ? { index: false, follow: false } : undefined,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const stored = await getSite(slug);
  if (!stored) notFound();
  // "?stil=luks" shows the same site in another style (for comparing; nothing is saved).
  const { stil } = await searchParams;
  const s = isSiteStyle(stil) ? { ...stored, style: stil } : stored;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/s/${slug}`;

  const edit = { slug, style: stored.style ?? DEFAULT_STYLE, ground: stored._meta?.input?.ground ?? "auto" };
  return <SitePage s={s}>{s._meta?.preview ? <PreviewBar url={url} studio={s.brand.name} edit={edit} /> : null}</SitePage>;
}
