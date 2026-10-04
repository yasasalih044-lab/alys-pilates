import { readUpload } from "@/lib/store";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg" };

/** Serves images uploaded through Site Yapıcı: /u/<slug>/<file>. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2) return new Response("Not found", { status: 404 });
  const [slug, name] = path;
  const data = await readUpload(slug, name);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[name.split(".").pop()!] ?? "application/octet-stream",
      // File names change whenever an image is regenerated, so they can be cached hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
