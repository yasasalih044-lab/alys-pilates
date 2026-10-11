import { NextResponse } from "next/server";
import { getStoredSite, saveSite } from "@/lib/store";
import { isSiteStyle } from "@/lib/styles";

// Changes only the style ("Tarz") of an existing Site Yapıcı preview. Nothing
// is regenerated and no AI service is called: one small JSON field is written.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW = 10 * 60 * 1000;
const LIMIT = 30;
const MAX_BODY = 512;
const SLUG = /^[a-z0-9-]{2,64}$/;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  hits.set(ip, [...recent, now]);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW)) hits.delete(k);
  return false;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return fail(429, "Çok fazla deneme, biraz sonra tekrar dene.");

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return fail(413, "İstek çok büyük.");
  let body: { slug?: unknown; style?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Geçersiz istek.");
  }
  if (!body || typeof body !== "object") return fail(400, "Geçersiz istek.");
  const { slug, style } = body;
  if (typeof slug !== "string" || !SLUG.test(slug) || !isSiteStyle(style)) return fail(400, "Geçersiz tarz.");

  const site = await getStoredSite(slug);
  if (!site || site._meta?.preview !== true) return fail(404, "Önizleme bulunamadı.");

  const meta = site._meta;
  await saveSite(slug, {
    ...site,
    style,
    _meta: { ...meta, updatedAt: new Date().toISOString(), ...(meta.input ? { input: { ...meta.input, style } } : {}) },
  });
  return NextResponse.json({ ok: true, style, url: `/s/${slug}` });
}
