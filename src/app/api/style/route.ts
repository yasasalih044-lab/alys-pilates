import { NextResponse } from "next/server";
import { siteOnGround } from "@/lib/generate";
import { toGround } from "@/lib/palette";
import { getStoredSite, saveSite } from "@/lib/store";
import { isSiteStyle } from "@/lib/styles";

// Edits an existing Site Yapıcı preview after it was built (done step and the
// preview's "Düzenle"): its style ("Tarz") and/or its page ground ("Zemin").
// Nothing is regenerated: a style is one JSON field; a ground recomputes the
// colours and cuts the logo again by code. Only a first dark ground on a site
// that never had one asks GPT for the white logo (once; it is kept).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW = 10 * 60 * 1000;
const LIMIT = 30;
const GROUND_LIMIT = 15;
const MAX_BODY = 512;
const SLUG = /^[a-z0-9-]{2,64}$/;
const hits = new Map<string, number[]>();
const busy = new Set<string>();

function rateLimited(key: string, limit: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  hits.set(key, [...recent, now]);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW)) hits.delete(k);
  return false;
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip, LIMIT)) return fail(429, "Çok fazla deneme, biraz sonra tekrar dene.");

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return fail(413, "İstek çok büyük.");
  let body: { slug?: unknown; style?: unknown; ground?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Geçersiz istek.");
  }
  if (!body || typeof body !== "object") return fail(400, "Geçersiz istek.");
  const { slug, style } = body;
  const ground = body.ground === undefined ? undefined : toGround(body.ground);
  if (typeof slug !== "string" || !SLUG.test(slug)) return fail(400, "Geçersiz istek.");
  if (style !== undefined && !isSiteStyle(style)) return fail(400, "Geçersiz tarz.");
  if (ground === null) return fail(400, "Geçersiz renk.");
  if (style === undefined && ground === undefined) return fail(400, "Değişiklik yok.");

  if (ground !== undefined && rateLimited(`ground:${ip}`, GROUND_LIMIT)) return fail(429, "Çok fazla renk denemesi, birkaç dakika sonra tekrar dene.");
  // One edit per site at a time (read after taking the lock), so a slow ground
  // change and a style picked meanwhile can't overwrite each other.
  if (busy.has(slug)) return fail(409, "Önceki değişiklik hâlâ kaydediliyor, birkaç saniye bekle.");
  busy.add(slug);
  let next;
  try {
    const site = await getStoredSite(slug);
    if (!site || site._meta?.preview !== true) return fail(404, "Önizleme bulunamadı.");
    next = ground !== undefined ? await siteOnGround(slug, site, ground) : site;
    if (isSiteStyle(style)) {
      const meta = next._meta!;
      next = { ...next, style, _meta: { ...meta, ...(meta.input ? { input: { ...meta.input, style } } : {}) } };
    }
    await saveSite(slug, { ...next, _meta: { ...next._meta!, updatedAt: new Date().toISOString() } });
  } catch (e) {
    console.error(`edit failed for ${slug}`, e);
    return fail(500, "Kaydedilemedi, lütfen tekrar dene.");
  } finally {
    busy.delete(slug);
  }
  return NextResponse.json({ ok: true, style: next.style, ground: next._meta?.input?.ground ?? "auto", url: `/s/${slug}` });
}
