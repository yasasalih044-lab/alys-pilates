import { NextResponse } from "next/server";
import { siteOnGround, whiteLogoLater } from "@/lib/generate";
import { toGround } from "@/lib/palette";
import { getStoredSite, saveSite } from "@/lib/store";
import { isSiteStyle } from "@/lib/styles";
import { memberFail, verifyMember } from "@/lib/member";

// Edits an existing Site Yapıcı preview after it was built (done step and the
// preview's "Düzenle"): its style ("Tarz") and/or its page ground ("Zemin").
// Nothing is regenerated: a style is one JSON field; a ground recomputes the
// colours and reuses the stored logo cut-out. A first dark ground on a site
// that never had one gets a code-made white logo at once and GPT's in the
// background (whiteLogoLater; kept for later edits).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW = 10 * 60 * 1000;
const LIMIT = 30;
const GROUND_LIMIT = 15;
const MAX_BODY = 3072; // slug + style + ground + the member's session token
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
  let body: { slug?: unknown; style?: unknown; ground?: unknown; m?: unknown };
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
  const member = await verifyMember(body.m);
  if (!member.ok) return memberFail(member.code);

  // One edit per site at a time (read after taking the lock), so a slow ground
  // change and a style picked meanwhile can't overwrite each other.
  if (busy.has(slug)) return fail(409, "Önceki değişiklik hâlâ kaydediliyor, birkaç saniye bekle.");
  if (ground !== undefined && rateLimited(`ground:${ip}`, GROUND_LIMIT)) return fail(429, "Çok fazla renk denemesi, birkaç dakika sonra tekrar dene.");
  busy.add(slug);
  let next;
  let later = false;
  try {
    const site = await getStoredSite(slug);
    if (!site || site._meta?.preview !== true) return fail(404, "Önizleme bulunamadı.");
    const owner = site._meta.owner?.leadId;
    if (owner && member.leadId && owner !== member.leadId) return fail(403, "Bu siteyi yalnız onu oluşturan hesap düzenleyebilir.");
    // A preview built before sign-in existed belongs to the first member who edits it.
    const claim = !owner && member.leadId ? { owner: { ...(site._meta.owner ?? { studio: site.brand?.name ?? "", whatsapp: "" }), leadId: member.leadId } } : {};
    next = ground !== undefined ? await siteOnGround(slug, site, ground, { quick: true }) : site;
    if (isSiteStyle(style)) {
      const meta = next._meta!;
      next = { ...next, style, _meta: { ...meta, ...(meta.input ? { input: { ...meta.input, style } } : {}) } };
    }
    const { _later, ...save } = next as typeof next & { _later?: boolean };
    await saveSite(slug, { ...save, _meta: { ...save._meta!, ...claim, updatedAt: new Date().toISOString() } });
    later = !!_later;
  } catch (e) {
    console.error(`edit failed for ${slug}`, e);
    return fail(500, "Kaydedilemedi, lütfen tekrar dene.");
  } finally {
    busy.delete(slug);
  }
  // First dark ground on this site: GPT's full-white logo follows in the background.
  if (later) void whiteLogoLater(slug, busy).catch((e) => console.error("white logo later failed", e));
  return NextResponse.json({ ok: true, style: next.style, ground: next._meta?.input?.ground ?? "auto", url: `/s/${slug}` });
}
