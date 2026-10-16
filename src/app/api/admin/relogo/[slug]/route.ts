import { siteOnGround } from "@/lib/generate";
import { toGround } from "@/lib/palette";
import { getSite, saveSite } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redoes only the logo files and the colours of an existing preview (same link):
 * cut-out logo, white logo, tab icon, theme — optionally on another page ground
 * (`{"ground":"beyaz"|"krem"|"siyah"|"#rrggbb"|"auto"}`). Photos and texts stay as they are.
 * Bearer ADMIN_TOKEN only.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site?._meta) return Response.json({ error: "not a generated site" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { ground?: unknown };
  try {
    const ground = toGround(body.ground) ?? site._meta.input?.ground ?? "auto";
    const next = await siteOnGround(slug, site, ground, { freshWhite: true });
    await saveSite(slug, next);
    return Response.json({ slug, url: `/s/${slug}`, mode: next.theme.mode, bg: next.theme.bg });
  } catch (e) {
    console.error("relogo failed", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
