import "server-only";
import sharp from "sharp";

const KEY = () => {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY is not set");
  return k;
};

/* ------------------------------------------------------------------ */
/* Copy: one strict-JSON call writes every text the template renders. */
/* ------------------------------------------------------------------ */

export type CopyInput = {
  studio: string;
  district: string;
  city: string;
  services: string[];
  /** Owner's raw notes per trainer; the model turns them into short bios. */
  trainers: { name: string; info: string }[];
  /** Write placeholder reviews (shown with an "örnek" note) when the owner gave none. */
  sampleReviews: boolean;
};

export type SiteCopy = {
  tagline: string;
  heroTitleLines: string[];
  trainerBios: { title: string; bio: string }[];
  reviews: { name: string; meta: string; body: string }[];
  marquee: string[];
};

const lines2 = { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 };

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tagline", "heroTitleLines", "trainerBios", "reviews", "marquee"],
  properties: {
    tagline: { type: "string" },
    heroTitleLines: lines2,
    trainerBios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "bio"],
        properties: { title: { type: "string" }, bio: { type: "string" } },
      },
    },
    reviews: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "meta", "body"],
        properties: { name: { type: "string" }, meta: { type: "string" }, body: { type: "string" } },
      },
    },
    marquee: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
  },
};

const SYSTEM = `Sen butik reformer pilates stüdyoları için Türkçe web sitesi metni yazan bir editörsün.
Ton: sakin, zarif, editoryal; kısa cümleler. Emoji, ünlem, markdown (*, _, #) YOK.

KESİN KURAL — uydurma yok: yıl, sertifika, ödül, üye sayısı, yüzde, sağlık/kilo vaadi gibi VERİLMEMİŞ bilgileri yazma.

heroTitleLines: iki satır birlikte TEK cümle, ikinci satır küçük harfle devam eder, sonu nokta, her satır 2–3 kelime ve EN FAZLA 16 karakter (boşluk dahil), stüdyo adı yok. Bu onaylı örneklerin kalitesinde ama aynısını kopyalamadan: ["Güçlen, esne,", "dengede kal."], ["Esne, güçlen,", "kendine dön."].
tagline: stüdyonun ilçesini ve verilen hizmetleri anan tek cümle.
trainerBios: verilen HER eğitmen için aynı sırayla. title = 2–4 kelimelik unvan (ör. "Reformer Pilates Eğitmeni"), notlarda daha net bir unvan varsa onu kullan. bio = notlardaki bilgileri 2–3 cümlelik, üçüncü tekil şahıs, sıcak ve profesyonel bir metne çevir; notlarda OLMAYAN hiçbir bilgiyi ekleme. Not boşsa bio tek cümle ve genel olsun (ör. derslerde hareketleri seviyeye göre ayarlar).
reviews: istenirse 6 adet örnek öğrenci yorumu (name: "Elif K." gibi ad + soyadın baş harfi; meta: verilen hizmetlerden biri; body: 1–2 cümle, somut ama abartısız, sayı/süre/sağlık vaadi yok). İstenmezse boş dizi.
marquee: tek kelimelik 5 Türkçe kavram; ilki "Reformer", ikincisi stüdyonun ilçesi.`;

export async function generateCopy(input: CopyInput): Promise<SiteCopy> {
  const trainers = input.trainers.length
    ? input.trainers.map((t, i) => `${i + 1}. ${t.name}: ${t.info || "(not yok)"}`).join("\n")
    : "(eğitmen yok — trainerBios boş dizi)";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY()}` },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Stüdyo: ${input.studio}\nKonum: ${input.district}, ${input.city}\nHizmetler: ${input.services.join(", ")}\nEğitmenler:\n${trainers}\nÖrnek yorum yaz: ${input.sampleReviews ? "evet, 6 adet" : "hayır"}`,
        },
      ],
      text: { format: { type: "json_schema", name: "site_copy", strict: true, schema: COPY_SCHEMA } },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`copy: ${data.error?.message ?? res.status}`);
  let text = "";
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) if (part.type === "output_text") text += part.text;
  }
  return clean(JSON.parse(text) as SiteCopy);
}

/** Strips stray markdown the model sometimes adds (e.g. "*vurgu*"). */
function clean<T>(v: T): T {
  if (typeof v === "string") return v.replace(/[*_#`]/g, "").replace(/\s{2,}/g, " ").trim() as T;
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) as T;
  return v;
}

/* ------------------------------------------------------------------ */
/* Logo: the same logo, drawn pure white on transparency (dark site). */
/* ------------------------------------------------------------------ */

const WHITE = `Recreate the attached logo as a single-color WHITE version for a black website header.
The logo must stay IDENTICAL: the same symbol, the same text with the same letterforms and letter case, the same stroke weights, proportions, spacing and positions. Do NOT redesign, restyle, add, remove or reinterpret anything.
Color rule: every letter, line, outline and symbol of the logo is drawn in pure white (#FFFFFF). Light background fills inside the logo (badge discs, boxes, plates) are removed, so the letters and lines stand on their own. Everything that is not the logo is solid pure black (#000000). No gray, no gradients, no other colors.
Perfectly crisp, clean, vector-like edges. Square 1:1, the logo centered with a little empty space around it.`;

export async function whiteLogo(file: Buffer, mime: string): Promise<Buffer> {
  // gpt-image-2 accepts png/jpeg/webp; normalise everything else to png.
  const input = ["image/png", "image/jpeg", "image/webp"].includes(mime) ? file : await sharp(file).png().toBuffer();
  const type = ["image/png", "image/jpeg", "image/webp"].includes(mime) ? mime : "image/png";
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new Blob([new Uint8Array(input)], { type }), `logo.${type.split("/")[1]}`);
  form.append("prompt", WHITE);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY()}` },
    body: form,
    signal: AbortSignal.timeout(240_000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`logo: ${json.error?.message ?? res.status}`);
  // Brightness becomes alpha, colour is forced to #fff: soft edges, no grey cast.
  const { data, info } = await sharp(Buffer.from(json.data[0].b64_json, "base64"))
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const v = data[i * info.channels];
    const a = v < 24 ? 0 : v > 232 ? 255 : Math.round(((v - 24) * 255) / 208);
    out.set([255, 255, 255, a], i * 4);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ height: 200, withoutEnlargement: true })
    .webp({ quality: 95, alphaQuality: 100 })
    .toBuffer();
}

/* ------------------------------------------------------------------ */
/* Hero photo: in the studio's own room (reference) and brand colours. */
/* ------------------------------------------------------------------ */

export async function heroImage(opts: { mode: "light" | "dark"; colours: string[]; room?: Buffer }): Promise<Buffer> {
  const palette = opts.colours.filter((c) => !["white", "black", "soft grey"].includes(c)).slice(0, 3);
  const outfit = palette[0] ?? "black";
  const style =
    opts.mode === "light"
      ? `Bright, airy editorial colour photograph for a boutique pilates studio. Soft natural daylight, calm and premium. Brand colours ${palette.join(", ") || "neutral tones"} appear in her activewear and small details.`
      : "Black-and-white editorial studio photograph, low-key dramatic side light, deep charcoal shadows, fine film grain, luxury fashion magazine look, lots of dark negative space.";
  const room = opts.room
    ? "Use the attached photo as the exact room: keep its walls, floor, windows, lighting fixtures and the same reformer machines; make it look like a professional photo shoot in that room."
    : "A clean boutique reformer pilates studio with light-wood reformer machines.";
  const prompt = `${style} ${room} A confident woman pilates instructor in her late twenties stands beside a reformer with one hand resting on its frame, wearing a fitted long-sleeve ${outfit} bodysuit, hair in a sleek bun, calm expression, three-quarter body framing from mid-thigh up, subject centred with clear space around her, vertical. Real-looking person, no text, no logo lettering, no watermark.`;

  let res: Response;
  if (opts.room) {
    const ref = await sharp(opts.room).rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("image[]", new Blob([new Uint8Array(ref)], { type: "image/jpeg" }), "room.jpg");
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", "high");
    form.append("output_format", "webp");
    form.append("output_compression", "86");
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY()}` },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1536", quality: "high", output_format: "webp", output_compression: 86 }),
      signal: AbortSignal.timeout(240_000),
    });
  }
  const json = await res.json();
  if (!res.ok) throw new Error(`hero: ${json.error?.message ?? res.status}`);
  return Buffer.from(json.data[0].b64_json, "base64");
}

/* ------------------------------------------------------------------ */
/* Light site: keep the colour logo, only its white ground becomes alpha (no AI). */
/* ------------------------------------------------------------------ */

export async function colourLogoOnTransparent(logo: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(logo).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    let a = 255 - Math.min(r, g, b);
    a = a < 10 ? 0 : Math.min(255, Math.round(((a - 10) * 255) / 245));
    if (a === 0) {
      data[i + 3] = 0;
      continue;
    }
    const k = 255 / a;
    data[i] = Math.max(0, 255 - (255 - r) * k);
    data[i + 1] = Math.max(0, 255 - (255 - g) * k);
    data[i + 2] = Math.max(0, 255 - (255 - b) * k);
    data[i + 3] = a;
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).resize({ height: 400, withoutEnlargement: true }).webp({ quality: 95, alphaQuality: 100 }).toBuffer();
}
