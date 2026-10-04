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
  classes: string[];
};

export type SiteCopy = {
  tagline: string;
  heroTitleLines: string[];
  servicesTitleLines: string[];
  servicesIntro: string;
  classDescriptions: string[];
  aboutTitleLines: string[];
  perspectiveHeadline: string;
  perspectiveHeadlineEm: string;
  principles: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  bookingTitleLines: string[];
  bookingBody: string;
  bookingCardTitleLines: string[];
  marquee: string[];
};

const lines2 = { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 };
const titleBody = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body"],
  properties: { title: { type: "string" }, body: { type: "string" } },
};

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "tagline",
    "heroTitleLines",
    "servicesTitleLines",
    "servicesIntro",
    "classDescriptions",
    "aboutTitleLines",
    "perspectiveHeadline",
    "perspectiveHeadlineEm",
    "principles",
    "faq",
    "bookingTitleLines",
    "bookingBody",
    "bookingCardTitleLines",
    "marquee",
  ],
  properties: {
    tagline: { type: "string" },
    heroTitleLines: lines2,
    servicesTitleLines: lines2,
    servicesIntro: { type: "string" },
    classDescriptions: { type: "array", items: { type: "string" } },
    aboutTitleLines: lines2,
    perspectiveHeadline: { type: "string" },
    perspectiveHeadlineEm: { type: "string" },
    principles: { type: "array", items: titleBody, minItems: 3, maxItems: 3 },
    faq: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "a"],
        properties: { q: { type: "string" }, a: { type: "string" } },
      },
    },
    bookingTitleLines: lines2,
    bookingBody: { type: "string" },
    bookingCardTitleLines: lines2,
    marquee: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
  },
};

const SYSTEM = `Sen butik reformer pilates stüdyoları için Türkçe web sitesi metni yazan bir editörsün.
Ton: sakin, zarif, editoryal; kısa cümleler; "sen" dili. Emoji, ünlem, markdown (*, _, #) YOK.

KESİN KURAL — uydurma yok: yıl/deneyim süresi, üye sayısı, ders süresi (dakika), grup kişi sayısı, ödül, sertifika, eğitmen adı, yüzde, garanti, sağlık/kilo vaadi, "en iyi" gibi bilgi verilmemiş ya da doğrulanamayan şeyleri YAZMA.

BAŞLIK SATIRLARI (…TitleLines): iki satır birlikte TEK cümle; ikinci satır küçük harfle devam eder (özel isim değilse), sonu nokta. Her satır 2–4 kelime. Stüdyo adını başlıklarda KULLANMA. Bu onaylı örneklerin kalitesinde ve tonunda yaz, ama aynısını kopyalama:
- hero: ["Güçlen, esne,", "dengede kal."]
- services: ["Her bedenin", "doğru bir temposu var."]
- about: ["Her hareket", "kontrolle başlar."]
- booking: ["Bir ders.", "Net bir başlangıç."]
- bookingCard: ["Kendine", "zaman ayır."]

perspectiveHeadline + perspectiveHeadlineEm birlikte tek cümle (ör. "Sana göre kurulan" + "bilinçli bir hareket."); Em kısmı 2–3 kelime, işaret koyma.
principles: reformer çalışma yaklaşımı hakkında 3 madde (ör. kontrollü hareket, ayarlanabilir yay direnci, eğitmen eşliği); başlık 2–3 kelime, gövde en fazla 18 kelime.
classDescriptions: verilen ders listesindeki HER ders için aynı sırayla tek cümle (en fazla 16 kelime); dersin adını cümlede tekrar etme.
faq: tam olarak şu 4 konu, bu sırayla: (1) daha önce hiç pilates yapmayan katılabilir mi, (2) derse gelirken ne getirmeli (rahat kıyafet ve kaymaz çorap), (3) reformer ile mat pilates farkı (yaylı, ayarlanabilir direnç), (4) ders saatleri ve randevu nasıl öğrenilir (WhatsApp'tan yazarak). Cevaplar en fazla 25 kelime.
bookingBody: deneme dersi için tek-iki kısa cümle davet.
servicesIntro: en fazla 14 kelime.
tagline: stüdyonun ilçesini içeren tek cümle (ör. "Kadıköy'de reformer pilates. Grup, özel ve düet dersler.").
marquee: tek kelimelik 5 Türkçe kavram; ilki "Reformer", ikincisi stüdyonun ilçesi.`;

export async function generateCopy(input: CopyInput): Promise<SiteCopy> {
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
          content: `Stüdyo: ${input.studio}\nKonum: ${input.district}, ${input.city}\nDersler (sırayla): ${input.classes.join(", ")}`,
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
