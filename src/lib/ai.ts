import "server-only";
import sharp from "sharp";

/**
 * gpt-image-2 quality. "medium" ≈ 4× cheaper than "high" (~$0.04 vs ~$0.17 per
 * portrait); the difference is invisible at the size the site shows photos.
 */
const IMAGE_QUALITY = process.env.IMAGE_QUALITY || "medium";

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
  // Landscape is cheaper than square for gpt-image-2 and fits most wordmarks.
  form.append("size", "1536x1024");
  form.append("quality", IMAGE_QUALITY);
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
/* Image calls: one place for edits/generations, 429 back-off, errors. */
/* ------------------------------------------------------------------ */

export class ImageError extends Error {
  constructor(
    message: string,
    readonly safety: boolean,
  ) {
    super(message);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** gpt-image-2 call. refs → images/edits (reference photos), none → images/generations. */
async function imageCall(prompt: string, size: string, refs: Buffer[] = []): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    if (refs.length) {
      const form = new FormData();
      form.append("model", "gpt-image-2");
      refs.forEach((r, i) => form.append("image[]", new Blob([new Uint8Array(r)], { type: "image/jpeg" }), `ref-${i}.jpg`));
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", IMAGE_QUALITY);
      form.append("output_format", "webp");
      form.append("output_compression", "80");
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
        body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality: IMAGE_QUALITY, output_format: "webp", output_compression: 80 }),
        signal: AbortSignal.timeout(240_000),
      });
    }
    const json = await res.json();
    if (res.ok) return Buffer.from(json.data[0].b64_json, "base64");
    const msg: string = json.error?.message ?? String(res.status);
    // Input-image rate limit is 5/min: wait as told and retry a few times.
    if (res.status === 429 && attempt < 4) {
      const secs = Number(/try again in ([\d.]+)s/.exec(msg)?.[1] ?? 15);
      await wait(Math.ceil(secs + 1) * 1000);
      continue;
    }
    throw new ImageError(msg, /safety/i.test(msg));
  }
}

/** Owner photos → small JPEG references (phone shots, story screenshots, HEIC-free). */
export async function asReference(img: Buffer) {
  return sharp(img).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
}

/* ------------------------------------------------------------------ */
/* Hero photo: in the studio's own room (references) and brand colours. */
/* ------------------------------------------------------------------ */

export async function heroImage(opts: { mode: "light" | "dark"; outfit: string; colours: string[]; rooms: Buffer[] }): Promise<Buffer> {
  const palette = opts.colours.filter((c) => !["white", "black", "soft grey"].includes(c)).slice(0, 3);
  const look =
    opts.mode === "light"
      ? "Bright, airy editorial colour photograph with soft natural daylight; calm, clean and premium."
      : `Cinematic editorial colour photograph with a calm, premium evening mood: the studio's own lighting, deep rich tones${palette.length ? ` and subtle ${palette.join(", ")} accents` : ""}.`;
  const subject = `A friendly female pilates instructor in her late twenties stands next to a reformer machine with one hand resting on its frame. She wears a modest matching athletic set — a long-sleeve sports top and full-length leggings — in ${opts.outfit}, hair tied back, natural confident smile. Framed from the knees up, vertical portrait, subject centred with clear space around her.`;
  const rules = "Professional fitness brand campaign photo, fully clothed, wholesome, realistic people. No text, no logos, no watermark, no phone interface.";
  const room = "The attached photos show this studio. Use it as the exact setting: same walls, floor, ceiling and lights, windows and the same reformer machines. Ignore any phone-app overlays, text, stickers or icons in the photos.";

  // 1) their studio as the set; 2) same look without references; the caller falls back to their own photo.
  if (opts.rooms.length) {
    try {
      return await imageCall(`${look} ${room} ${subject} ${rules}`, "1024x1536", opts.rooms.slice(0, 2));
    } catch (e) {
      console.error("hero with studio references failed", (e as Error).message);
    }
  }
  return imageCall(`${look} A boutique reformer pilates studio with wooden reformer machines. ${subject} ${rules}`, "1024x1536");
}

/** Their own studio photo as the hero when generation is refused: never another studio's image. */
export async function roomAsHero(room: Buffer) {
  return sharp(room).rotate().resize(1024, 1536, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toBuffer();
}

/* ------------------------------------------------------------------ */
/* Trainer photo: the same person, clean white background, no graphics. */
/* ------------------------------------------------------------------ */

export async function trainerPortrait(photo: Buffer): Promise<Buffer> {
  const prompt =
    "Cut the person out of the attached photo and place them on a seamless pure white studio background. Remove every text, caption, arrow, logo, sticker and graphic element. Keep the person exactly as they are: same face, hair, skin tone, clothing and pose — do not beautify, slim, age or change their identity. Soft even studio light with a gentle natural shadow. Vertical 4:5 portrait, head to waist, centred.";
  const img = await imageCall(prompt, "1024x1280", [await asReference(photo)]);
  // Shown ~400px wide: 800px covers retina and keeps the page light.
  return sharp(img).resize({ width: 800 }).webp({ quality: 80 }).toBuffer();
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

/* ------------------------------------------------------------------ */
/* No-AI fallbacks: the site still builds when OpenAI is unavailable.  */
/* ------------------------------------------------------------------ */

const HERO_LINES = [
  ["Güçlen, esne,", "dengede kal."],
  ["Esne, güçlen,", "kendine dön."],
  ["Nefes al,", "kendine alan aç."],
  ["Her hareket", "seni güçlendirir."],
];

/** Approved, claim-free copy used when the copy call fails. */
export function fallbackCopy(input: CopyInput): SiteCopy {
  const pick = [...input.studio].reduce((n, c) => n + c.charCodeAt(0), 0) % HERO_LINES.length;
  const svc = input.services[0] ?? "Reformer";
  const sentence = (t: string) => (t ? t.charAt(0).toLocaleUpperCase("tr") + t.slice(1).replace(/[.\s]*$/, ".") : "");
  return {
    tagline: `${input.district}'de ${input.services.join(", ").toLocaleLowerCase("tr")}.`,
    heroTitleLines: HERO_LINES[pick],
    trainerBios: input.trainers.map((t) => ({
      title: "Pilates Eğitmeni",
      bio: t.info ? sentence(t.info) : "Derslerde hareketleri seviyene göre ayarlar ve her adımda eşlik eder.",
    })),
    reviews: input.sampleReviews
      ? [
          { name: "Elif K.", meta: svc, body: "İlk derste çok çekiniyordum ama hareketler bana göre ayarlandı. Artık haftamın en sevdiğim saati." },
          { name: "Merve A.", meta: svc, body: "Her hareketin nedenini anlatmaları çok güven verdi. Stüdyonun sakin havası da ayrıca iyi geliyor." },
          { name: "Zeynep T.", meta: svc, body: "Arkadaşımla birlikte geliyoruz; hem motivasyon hem keyif." },
          { name: "Selin D.", meta: svc, body: "Eğitmen herkesle tek tek ilgileniyor, duruşumdaki farkı kısa sürede fark ettim." },
          { name: "Buse Y.", meta: svc, body: "Ders saatlerini esnek ayarlayabilmek benim için çok önemliydi." },
          { name: "Ayşe Ç.", meta: svc, body: "Daha önce hiç pilates yapmamıştım, sabırları sayesinde kısa sürede alıştım." },
        ]
      : [],
    marquee: ["Reformer", input.district, "Denge", "Nefes", "Güç"],
  };
}

/**
 * Logo on a dark ground (e.g. blue letters on navy) → the same colour logo on
 * transparency: pixels close to the ground colour fade out. No AI involved.
 */
export async function logoOnDark(logo: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(logo).flatten({ background: "#000000" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const cs = [at(2, 2), at(info.width - 3, 2), at(2, info.height - 3), at(info.width - 3, info.height - 3)];
  const g = [0, 1, 2].map((k) => cs.reduce((n, c) => n + c[k], 0) / cs.length);
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.max(Math.abs(data[i] - g[0]), Math.abs(data[i + 1] - g[1]), Math.abs(data[i + 2] - g[2])) / 255;
    const t = Math.min(1, Math.max(0, (d - 0.12) / 0.33));
    data[i + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).resize({ height: 400, withoutEnlargement: true }).webp({ quality: 95, alphaQuality: 100 }).toBuffer();
}
