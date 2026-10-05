import { normalizeWhatsapp, type BuilderInput } from "@/lib/build-site";
import { generateSite } from "@/lib/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE = 12 * 1024 * 1024;
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

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};

function imageFile(v: FormDataEntryValue | null): File | null {
  if (!v || typeof v === "string" || v.size === 0) return null;
  if (v.size > MAX_FILE || !v.type.startsWith("image/")) throw new Error("Görseller en fazla 12 MB ve resim dosyası olmalı.");
  return v;
}
const bytes = async (f: File) => Buffer.from(await f.arrayBuffer());

function parseInput(raw: unknown): BuilderInput {
  const p = (raw ?? {}) as Record<string, unknown>;
  const accent = str(p.accent, 7);
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    studio: str(p.studio, 60),
    district: str(p.district, 40),
    city: str(p.city, 40) || "İstanbul",
    address: str(p.address, 160),
    whatsapp: normalizeWhatsapp(str(p.whatsapp, 24)),
    instagram: str(p.instagram, 40).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, ""),
    accent: accent === "auto" || /^#[0-9a-f]{6}$/i.test(accent) ? accent : accent === "" ? "" : "auto",
    services: list(p.services)
      .slice(0, 6)
      .map((s) => s as Record<string, unknown>)
      .map((s) => ({
        name: str(s.name, 40),
        packages: list(s.packages)
          .slice(0, 6)
          .map((k) => k as Record<string, unknown>)
          .map((k) => ({ sessions: num(k.sessions, 500) ?? 0, price: num(k.price, 9_999_999) }))
          .filter((k) => k.sessions > 0),
      }))
      .filter((s) => s.name && s.packages.length),
    trainers: list(p.trainers)
      .slice(0, 4)
      .map((t) => t as Record<string, unknown>)
      .map((t) => ({ name: str(t.name, 50), info: str(t.info, 600) }))
      .filter((t) => t.name),
    reviews: list(p.reviews)
      .slice(0, 8)
      .map((r) => r as Record<string, unknown>)
      .map((r) => ({ name: str(r.name, 40), text: str(r.text, 400) }))
      .filter((r) => r.name && r.text),
  };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json({ error: "Kısa sürede çok fazla site oluşturuldu. Biraz sonra tekrar dene." }, { status: 429 });
  }

  let form: FormData;
  let input: BuilderInput;
  try {
    form = await req.formData();
    input = parseInput(JSON.parse(str(form.get("payload"), 50_000) || "{}"));
  } catch {
    return Response.json({ error: "Form okunamadı." }, { status: 400 });
  }
  if (str(form.get("website"))) return Response.json({ error: "Geçersiz istek." }, { status: 400 }); // honeypot

  let logo: File | null;
  let rooms: File[];
  let trainerFiles: (File | null)[];
  try {
    logo = imageFile(form.get("logo"));
    rooms = [0, 1, 2].map((i) => imageFile(form.get(`photo_${i}`))).filter((f): f is File => !!f);
    trainerFiles = input.trainers.map((_, i) => imageFile(form.get(`trainer_${i}`)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!input.studio || !input.district || !logo) return Response.json({ error: "Stüdyo adı, ilçe ve logo gerekli." }, { status: 400 });
  if (!input.whatsapp) return Response.json({ error: "Geçerli bir WhatsApp numarası gir (05xx xxx xx xx)." }, { status: 400 });
  if (!input.services.length) return Response.json({ error: "En az bir hizmet ve seans paketi gir." }, { status: 400 });

  try {
    const slug = await generateSite(
      input,
      {
        logo: await bytes(logo),
        rooms: await Promise.all(rooms.map(bytes)),
        trainers: await Promise.all(trainerFiles.map((f) => (f ? bytes(f) : null))),
      },
      { ip },
    );
    return Response.json({ slug, url: `/s/${slug}` });
  } catch (e) {
    console.error("generate failed", e);
    return Response.json({ error: "Site oluşturulamadı, lütfen tekrar dene." }, { status: 500 });
  }
}
