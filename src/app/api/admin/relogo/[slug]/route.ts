import { brandLogos, filesFromStore, inputFromSite } from "@/lib/generate";
import { isGroundChoice, paletteFromLogo, themeForGround } from "@/lib/palette";
import { getSite, saveSite } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redoes only the logo files and the colours of an existing preview (same link):
 * cut-out logo, white logo, tab icon, theme — optionally on another page ground
 * (`{"ground":"beyaz"|"krem"|"siyah"|"auto"}`). Photos and texts stay as they are.
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
    const input = inputFromSite(site);
    if (isGroundChoice(body.ground)) input.ground = body.ground;
    const files = await filesFromStore(slug, site);
    const palette = await paletteFromLogo(files.logo, files.rooms);
    if (input.ground && input.ground !== "auto") palette.theme = themeForGround(palette, input.ground);
    const logos = await brandLogos(slug, Date.now().toString(36), files.logo, palette);
    const accent = input.accent === "auto" ? palette.theme.accent : input.accent;
    await saveSite(slug, {
      ...site,
      theme: { ...palette.theme, accent },
      brand: { ...site.brand, logo: logos.logo, mark: logos.onLight, originalLogo: logos.onLight, logoOnLight: logos.onLight, icon: logos.icon },
      _meta: { ...site._meta, updatedAt: new Date().toISOString(), input },
    });
    return Response.json({ slug, url: `/s/${slug}`, mode: palette.theme.mode, bg: palette.theme.bg });
  } catch (e) {
    console.error("relogo failed", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
