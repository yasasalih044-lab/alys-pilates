import { filesFromStore, generateSite, inputFromSite } from "@/lib/generate";
import { getSite } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rebuilds an existing preview in place (same link) from its stored input and
 * uploads — used after prompt/template improvements. Bearer ADMIN_TOKEN only.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site?._meta) return Response.json({ error: "not a generated site" }, { status: 404 });
  try {
    await generateSite(inputFromSite(site), await filesFromStore(slug, site), {
      slug,
      ip: site._meta.owner?.ip,
      createdAt: site._meta.createdAt,
    });
    return Response.json({ slug, url: `/s/${slug}` });
  } catch (e) {
    console.error("regenerate failed", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
