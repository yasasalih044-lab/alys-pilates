import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SitePage from "@/components/site/site-page";
import { PreviewBar } from "@/components/site/preview-bar";
import { getSite } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const s = await getSite(slug);
  if (!s) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/s/${slug}`;

  return <SitePage s={s}>{s._meta?.preview ? <PreviewBar url={url} studio={s.brand.name} /> : null}</SitePage>;
}
