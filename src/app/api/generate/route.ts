import sharp from "sharp";
import { generateCopy, whiteLogo } from "@/lib/ai";
import { buildSite, CLASSES, normalizeWhatsapp, type BuilderInput, type ClassKey } from "@/lib/build-site";
import { makeSlug, saveSite, saveUpload } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE = 10 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/** Each build calls gpt-image-2, so a public form needs a small per-IP cap. */
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= 5) return true;
  hits.set(ip, [...recent, now]);
  return false;
}

const str = (v: FormDataEntryValue | null, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const price = (v: FormDataEntryValue | null) => {
  const n = Number(str(v, 12).replace(/\D/g, ""));
  return n > 0 ? n : null;
};

function imageFile(v: FormDataEntryValue | null): File | null {
  if (!v || typeof v === "string" || v.size === 0) return null;
  if (v.size > MAX_FILE || !v.type.startsWith("image/")) throw new Error("Görseller en fazla 10 MB ve resim dosyası olmalı.");
  return v;
}

async function photo(slug: string, name: string, file: File | null) {
  if (!file) return undefined;
  const webp = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return saveUpload(slug, `${name}.webp`, webp);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json({ error: "Kısa sürede çok fazla site oluşturuldu. Biraz sonra tekrar dene." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Form okunamadı." }, { status: 400 });
  }
  if (str(form.get("website"))) return Response.json({ error: "Geçersiz istek." }, { status: 400 }); // honeypot

  const classes = form.getAll("classes").filter((c): c is ClassKey => typeof c === "string" && c in CLASSES);
  const accent = str(form.get("accent"), 7);
  const input: BuilderInput = {
    studio: str(form.get("studio"), 60),
    district: str(form.get("district"), 40),
    city: str(form.get("city"), 40) || "İstanbul",
    address: str(form.get("address"), 160),
    whatsapp: normalizeWhatsapp(str(form.get("whatsapp"), 24)),
    instagram: str(form.get("instagram"), 40).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, ""),
    accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : "",
    classes: classes.length ? classes : ["group"],
    prices: {
      group: [price(form.get("price_group_4")), price(form.get("price_group_8")), price(form.get("price_group_12"))],
      private: [price(form.get("price_private_4")), price(form.get("price_private_8")), price(form.get("price_private_12"))],
    },
  };

  let logo: File | null;
  let photos: (File | null)[];
  try {
    logo = imageFile(form.get("logo"));
    photos = ["photo_hero", "photo_studio", "photo_detail"].map((k) => imageFile(form.get(k)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!input.studio || !input.district || !logo) {
    return Response.json({ error: "Stüdyo adı, ilçe ve logo gerekli." }, { status: 400 });
  }
  if (!input.whatsapp) {
    return Response.json({ error: "Geçerli bir WhatsApp numarası gir (05xx xxx xx xx)." }, { status: 400 });
  }

  try {
    const slug = await makeSlug(input.studio);
    const logoBytes = Buffer.from(await logo.arrayBuffer());
    const original = await sharp(logoBytes).resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    const originalUrl = await saveUpload(slug, "logo-original.png", original);

    // Copy, white logo and photos run in parallel; the logo is the slow part (~30–60 s).
    const [copy, logoUrl, hero, studio, detail] = await Promise.all([
      generateCopy({
        studio: input.studio,
        district: input.district,
        city: input.city,
        classes: input.classes.map((k) => CLASSES[k].name),
      }),
      whiteLogo(original, "image/png")
        .then((webp) => saveUpload(slug, "logo-white.webp", webp))
        .catch((e) => {
          console.error("white logo failed, using original", e);
          return originalUrl;
        }),
      photo(slug, "hero", photos[0]),
      photo(slug, "studio", photos[1]),
      photo(slug, "detail", photos[2]),
    ]);

    const site = buildSite(input, copy, { logo: logoUrl, originalLogo: originalUrl, hero, studio, detail });
    await saveSite(slug, {
      ...site,
      _meta: {
        createdAt: new Date().toISOString(),
        preview: true,
        owner: { studio: input.studio, whatsapp: input.whatsapp, ip },
      },
    });
    console.log(`site created: ${slug} (${input.studio}, ${input.district})`);
    return Response.json({ slug, url: `/s/${slug}` });
  } catch (e) {
    console.error("generate failed", e);
    return Response.json({ error: "Site oluşturulamadı, lütfen tekrar dene." }, { status: 500 });
  }
}
