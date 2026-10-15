import "server-only";
import sharp from "sharp";

/**
 * gpt-image-2 quality. "medium" ≈ 4× cheaper than "high" (~$0.04 vs ~$0.17 per
 * portrait); the difference is invisible at the size the site shows photos.
 */
const IMAGE_QUALITY = process.env.IMAGE_QUALITY || "medium";

/**
 * Smallest sizes gpt-image-2 accepts (below ~0.7 MP it answers "below the
 * minimum pixel budget"); visitors are on phones, so we generate small and
 * then shrink the delivered file further. Second entry = fallback size.
 */
const SIZES = {
  hero: ["704x1056", "1024x1536"],
  trainer: ["768x960", "1024x1280"],
  logo: ["1024x672", "1536x1024"],
} as const;

/** Phone-sized delivery: width in px and WebP quality. */
async function forPhones(img: Buffer, width: number) {
  return sharp(img).resize({ width, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
}

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
  trainerBios: { title: string; bio: string }[];
  reviews: { name: string; meta: string; body: string }[];
  marquee: string[];
};

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tagline", "trainerBios", "reviews", "marquee"],
  properties: {
    tagline: { type: "string" },
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
  form.append("size", SIZES.logo[0]);
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
  let edge = 0;
  let edgeAlpha = 0;
  let solid = 0;
  const ring = Math.round(Math.min(info.width, info.height) * 0.04);
  for (let i = 0; i < info.width * info.height; i++) {
    const v = data[i * info.channels];
    const a = v < 24 ? 0 : v > 232 ? 255 : Math.round(((v - 24) * 255) / 208);
    out.set([255, 255, 255, a], i * 4);
    const x = i % info.width;
    const y = (i - x) / info.width;
    if (a > 127) solid++;
    if (x < ring || y < ring || x >= info.width - ring || y >= info.height - ring) {
      edge++;
      edgeAlpha += a / 255;
    }
  }
  // GPT sometimes returns the logo still on its (light or textured) ground: a box,
  // not a logo. Refuse it so the caller uses the exact code-made white version.
  if (edgeAlpha / edge > 0.04 || solid > info.width * info.height * 0.5) throw new Error("white logo came back with its background");
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
async function imageCall(prompt: string, sizes: readonly string[], refs: Buffer[] = []): Promise<Buffer> {
  let sizeIndex = 0;
  for (let attempt = 0; ; attempt++) {
    const size = sizes[sizeIndex];
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
    // Size below the pixel budget (OpenAI may raise it): retry once at the larger size.
    if (/pixel budget|Invalid size/i.test(msg) && sizeIndex < sizes.length - 1) {
      sizeIndex++;
      continue;
    }
    throw new ImageError(msg, /safety/i.test(msg));
  }
}

/** Owner photos → small JPEG references (phone shots, story screenshots, HEIC-free). */
export async function asReference(img: Buffer) {
  return sharp(img).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer();
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
      return await forPhones(await imageCall(`${look} ${room} ${subject} ${rules}`, SIZES.hero, opts.rooms.slice(0, 2)), 640);
    } catch (e) {
      console.error("hero with studio references failed", (e as Error).message);
    }
  }
  return forPhones(await imageCall(`${look} A boutique reformer pilates studio with wooden reformer machines. ${subject} ${rules}`, SIZES.hero), 640);
}

/** Their own studio photo as the hero when generation is refused: never another studio's image. */
export async function roomAsHero(room: Buffer) {
  return sharp(room).rotate().resize(640, 960, { fit: "cover", position: "attention" }).webp({ quality: 76 }).toBuffer();
}

/* ------------------------------------------------------------------ */
/* Trainer photo: the same person, clean white background, no graphics. */
/* ------------------------------------------------------------------ */

export async function trainerPortrait(photo: Buffer): Promise<Buffer> {
  const prompt =
    "Cut the person out of the attached photo and place them on a seamless pure white studio background. Remove every text, caption, arrow, logo, sticker and graphic element. Keep the person exactly as they are: same face, hair, skin tone, clothing and pose — do not beautify, slim, age or change their identity. Soft even studio light with a gentle natural shadow. Vertical 4:5 portrait, head to waist, centred.";
  // Card is ~400px wide on phones: 600px keeps it sharp and small.
  return forPhones(await imageCall(prompt, SIZES.trainer, [await asReference(photo)]), 600);
}


/**
 * Logo → the logo alone on a transparent background, by code (no AI, the logo is
 * never redrawn). Handles flat, gradient and textured (marble, paper) grounds,
 * badge logos (disc on a square), and phone screenshots with bars or edge lines:
 *  1. ground colours = clusters of the image border's colours,
 *  2. the ground is everything connected to the border through those colours
 *     (so letters that share the frame colour, inside a badge, are kept),
 *     plus the badge disc (`badge` = its colour) when there is one,
 *  3. each remaining pixel's opacity = its distance from the local ground
 *     (mapped on a coarse grid, so gradients are followed); colour un-blended,
 *  4. specks and thin lines stuck to the image edge are dropped.
 * A logo that already has a transparent background is only trimmed.
 */
export async function logoCutout(logo: Buffer, badge?: [number, number, number]): Promise<Buffer> {
  const finish = (img: ReturnType<typeof sharp>) =>
    img.trim({ threshold: 1 }).resize({ height: 400, withoutEnlargement: true }).webp({ quality: 95, alphaQuality: 100 }).toBuffer();
  if ((await sharp(logo).metadata()).hasAlpha) {
    // Already cut out = its border is (almost) fully transparent. A semi-transparent
    // texture behind the logo does not count: that still has to be removed.
    const { data, info } = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = Math.max(1, Math.round(Math.min(info.width, info.height) * 0.03));
    let edge = 0;
    let clear = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (x >= r && y >= r && x < info.width - r && y < info.height - r) continue;
        edge++;
        if (data[(y * info.width + x) * 4 + 3] < 16) clear++;
      }
    if (clear > edge * 0.8) return finish(sharp(logo).ensureAlpha());
  }
  const { data, info } = await sharp(logo).flatten({ background: "#ffffff" }).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const N = w * h;
  const col = (i: number): number[] => [data[i * ch], data[i * ch + 1], data[i * ch + 2]];
  const dist = (a: number[], b: number[]) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

  // 1. Border colour clusters (k-means, k ≤ 4) with their spread, so textures count as ground.
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const samples: number[][] = [];
  const sides: number[] = []; // 0 top, 1 right, 2 bottom, 3 left
  const step = Math.max(1, Math.floor((2 * ring * (w + h)) / 4000));
  let k = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (x >= ring && y >= ring && x < w - ring && y < h - ring) continue;
      if (k++ % step) continue;
      samples.push(col(y * w + x));
      const near = [y, w - 1 - x, h - 1 - y, x];
      sides.push(near.indexOf(Math.min(...near)));
    }
  let centres = [0, 0.33, 0.66, 0.99].map((f) => samples[Math.floor(f * (samples.length - 1))]);
  let groups: number[][][] = [];
  let owner: number[] = [];
  for (let it = 0; it < 8; it++) {
    groups = centres.map(() => []);
    owner = samples.map((c) => {
      let best = 0;
      for (let j = 1; j < centres.length; j++) if (dist(c, centres[j]) < dist(c, centres[best])) best = j;
      groups[best].push(c);
      return best;
    });
    centres = groups.map((g, j) => (g.length ? [0, 1, 2].map((m) => g.reduce((t, c) => t + c[m], 0) / g.length) : centres[j]));
  }
  // A ground colour surrounds the logo: it shows on ≥ 3 sides, or covers most of a
  // side (screenshot bars). Lettering that merely touches one edge is not ground.
  const perSide = [0, 1, 2, 3].map((sd) => sides.filter((v) => v === sd).length || 1);
  const grounds = groups
    .map((g, j) => {
      const cover = [0, 1, 2, 3].map((sd) => owner.filter((o, i) => o === j && sides[i] === sd).length / perSide[sd]);
      return {
        c: centres[j],
        n: g.length,
        spread: g.length ? g.reduce((t, c) => t + dist(c, centres[j]), 0) / g.length : 0,
        surrounds: cover.filter((f) => f > 0.05).length >= 3 || Math.max(...cover) > 0.6,
      };
    })
    .filter((g) => g.n > samples.length * 0.03 && g.surrounds);
  const nearGround = (c: number[]) => grounds.some((g) => dist(c, g.c) < Math.max(44, g.spread * 2.4));

  // 2. Ground. bg: 1 = ground (also feeds the local-ground grid), 2 = removed seam only.
  const bg = new Uint8Array(N);
  const component = (p0: number, ok: (q: number) => boolean, seen: Uint8Array) => {
    const members = [p0];
    seen[p0] = 1;
    for (let i = 0; i < members.length; i++) {
      const p = members[i];
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w])
        if (q >= 0 && q < N && !seen[q] && ok(q)) {
          seen[q] = 1;
          members.push(q);
        }
    }
    return members;
  };
  let disc: number[] = [];
  if (badge) {
    // Badge: the largest region of the badge colour is the disc. Everything outside
    // its convex outline is the frame; inside it, only the disc itself is ground, so
    // letters that touch the rim or share the frame colour are kept.
    const isBadge = (q: number) => dist(col(q), badge) <= 48;
    const seen = new Uint8Array(N);
    for (let p0 = 0; p0 < N; p0++) {
      if (seen[p0] || !isBadge(p0)) continue;
      const m = component(p0, isBadge, seen);
      if (m.length > disc.length) disc = m;
    }
    if (disc.length < N * 0.12) disc = [];
  }
  if (disc.length) {
    // Convex hull (monotone chain) of each row's leftmost/rightmost disc pixel.
    const minX = new Int32Array(h).fill(w);
    const maxX = new Int32Array(h).fill(-1);
    for (const p of disc) {
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX[y]) minX[y] = x;
      if (x > maxX[y]) maxX[y] = x;
    }
    const pts: [number, number][] = [];
    for (let y = 0; y < h; y++) if (maxX[y] >= 0) pts.push([minX[y], y], [maxX[y], y]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower: [number, number][] = [];
    const upper: [number, number][] = [];
    for (const pt of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    for (const pt of [...pts].reverse()) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
    // Row and column spans of the convex outline → inside test and distance to the rim.
    const span = (axis: 0 | 1, at: number) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < hull.length; i++) {
        const a = hull[i];
        const b = hull[(i + 1) % hull.length];
        const o = 1 - axis;
        if ((a[o] - at) * (b[o] - at) > 0) continue;
        const t = b[o] === a[o] ? 0 : (at - a[o]) / (b[o] - a[o]);
        for (const v of b[o] === a[o] ? [a[axis], b[axis]] : [a[axis] + t * (b[axis] - a[axis])]) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
      return [lo, hi];
    };
    const rows = Array.from({ length: h }, (_, y) => span(0, y));
    const cols = Array.from({ length: w }, (_, x) => span(1, x));
    const seam = Math.max(2, Math.round(Math.min(w, h) / 70));
    for (let p = 0; p < N; p++) {
      const x = p % w;
      const y = (p - x) / w;
      const d = Math.min(x - rows[y][0], rows[y][1] - x, y - cols[x][0], cols[x][1] - y);
      if (!(d >= seam)) bg[p] = 2;
    }
    for (const p of disc) bg[p] = 1;
  } else {
    // Ground = everything connected to the image border through the border's colours.
    const seen = new Uint8Array(N);
    const ok = (q: number) => nearGround(col(q));
    const seeds: number[] = [];
    for (let x = 0; x < w; x++) seeds.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) seeds.push(y * w, y * w + w - 1);
    for (const p0 of seeds) if (!seen[p0] && ok(p0)) for (const p of component(p0, ok, seen)) bg[p] = 1;
  }

  // 3. Local ground on a coarse grid (from ground pixels), bilinear in between.
  const cell = Math.max(8, Math.round(Math.max(w, h) / 14));
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid: (number[] | null)[] = new Array(gw * gh).fill(null);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      const sum = [0, 0, 0];
      let n = 0;
      for (let y = gy * cell; y < Math.min(h, (gy + 1) * cell); y++)
        for (let x = gx * cell; x < Math.min(w, (gx + 1) * cell); x++) {
          if (bg[y * w + x] !== 1) continue; // ground pixels only (the disc, for badges)
          const c = col(y * w + x);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
          n++;
        }
      if (n > 4) grid[gy * gw + gx] = sum.map((v) => v / n);
    }
  for (let pass = 0; pass < gw + gh && grid.some((c) => !c); pass++) {
    const prev = grid.slice();
    for (let i = 0; i < grid.length; i++) {
      if (prev[i]) continue;
      const gx = i % gw;
      const gy = (i - gx) / gw;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => (gx + dx >= 0 && gx + dx < gw && gy + dy >= 0 && gy + dy < gh ? prev[(gy + dy) * gw + gx + dx] : null))
        .filter((c): c is number[] => !!c);
      if (near.length) grid[i] = [0, 1, 2].map((j) => near.reduce((t, c) => t + c[j], 0) / near.length);
    }
  }
  const fallback = grounds[0]?.c ?? [255, 255, 255];
  const groundAt = (x: number, y: number) => {
    const fx = Math.min(gw - 1, Math.max(0, x / cell - 0.5));
    const fy = Math.min(gh - 1, Math.max(0, y / cell - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(gw - 1, x0 + 1);
    const y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const g = (gx: number, gy: number) => grid[gy * gw + gx] ?? fallback;
    return [0, 1, 2].map((j) => (g(x0, y0)[j] * (1 - tx) + g(x1, y0)[j] * tx) * (1 - ty) + (g(x0, y1)[j] * (1 - tx) + g(x1, y1)[j] * tx) * ty);
  };
  // Opacity: distance from the local ground over the largest distance a colour can
  // have from it, above the ground's own noise (texture) — linear, so thin light
  // lettering keeps its weight. The colour is un-blended from the ground.
  const spread = disc.length ? 0 : Math.min(40, Math.max(0, ...grounds.map((g) => g.spread)));
  const noise = 8 + spread * 1.6;
  const out = Buffer.alloc(N * 4);
  for (let p = 0; p < N; p++) {
    if (bg[p]) continue;
    const x = p % w;
    const c = col(p);
    const g = groundAt(x, (p - x) / w);
    const reach = Math.max(96, ...g.map((v) => Math.max(v, 255 - v)));
    const a = Math.min(1, Math.max(0, (dist(c, g) - noise) / (reach - noise)) * 1.25);
    if (a <= 0.02) continue;
    for (let j = 0; j < 3; j++) out[p * 4 + j] = Math.max(0, Math.min(255, Math.round(g[j] + (c[j] - g[j]) / a)));
    out[p * 4 + 3] = Math.round(a * 255);
  }

  // 4. Drop specks and thin lines stuck to the image edge (screenshot leftovers).
  const label = new Int32Array(N).fill(-1);
  const thin = Math.max(4, Math.round(Math.min(w, h) * 0.025));
  for (let p0 = 0; p0 < N; p0++) {
    if (label[p0] !== -1 || out[p0 * 4 + 3] < 90) continue;
    const members: number[] = [];
    const st = [p0];
    label[p0] = p0;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (st.length) {
      const p = st.pop()!;
      members.push(p);
      const x = p % w;
      const y = (p - x) / w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q < 0 || q >= N || label[q] !== -1 || out[q * 4 + 3] < 90) continue;
        label[q] = p0;
        st.push(q);
      }
    }
    const touchesEdge = x0 <= ring || y0 <= ring || x1 >= w - 1 - ring || y1 >= h - 1 - ring;
    const isThin = Math.min(x1 - x0 + 1, y1 - y0 + 1) <= thin && Math.max(x1 - x0 + 1, y1 - y0 + 1) > thin * 4;
    if (members.length < Math.max(3, N * 0.00006) || (touchesEdge && isThin)) for (const p of members) out[p * 4 + 3] = 0;
  }
  return finish(sharp(out, { raw: { width: w, height: h, channels: 4 } }));
}

/** The cut-out logo in one colour (its exact shape): white for dark pages, ink for light ones. */
export async function logoInColour(cutout: Buffer, hex: string): Promise<Buffer> {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return sharp(data, { raw: info }).webp({ quality: 95, alphaQuality: 100 }).toBuffer();
}

/** Contrast of a cut-out logo's own colours against a page colour (opacity-weighted). */
export async function logoContrast(cutout: Buffer, pageHex: string): Promise<number> {
  const { data } = await sharp(cutout).ensureAlpha().resize(160, 160, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 0.5) continue;
    sum += L(data[i], data[i + 1], data[i + 2]) * a;
    wsum += a;
  }
  if (!wsum) return 1;
  const page = L(...([1, 3, 5].map((i) => parseInt(pageHex.slice(i, i + 2), 16)) as [number, number, number]));
  const [x, y] = [sum / wsum, page].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}


/* ------------------------------------------------------------------ */
/* Gallery: the owner's photos, re-shot in our editorial look.         */
/* ------------------------------------------------------------------ */

const GALLERY_SHOTS = [
  "A wide interior photograph of this studio, tidy and inviting, the reformer machines neatly lined up, nobody in the frame.",
  "A woman doing a calm reformer pilates exercise in this studio, side view, wearing a modest long-sleeve sports top and full-length leggings in {outfit}.",
  "A close-up detail of a reformer in this studio: carriage, leather straps and springs, shallow depth of field, soft background of the room.",
];

export async function galleryImage(room: Buffer, shot: number, opts: { mode: "light" | "dark"; outfit: string }): Promise<Buffer> {
  const look =
    opts.mode === "light"
      ? "Bright, airy editorial colour photograph with soft natural daylight; calm, clean and premium."
      : "Cinematic editorial colour photograph with a calm, premium evening mood and the studio's own lighting.";
  const room_ =
    "The attached photo is from this studio: keep its real walls, floor, windows, light and equipment. If it does not show the room, create a matching boutique reformer pilates studio in its colours. Ignore phone-app overlays, text, neon signs with words, stickers and logos.";
  const subject = GALLERY_SHOTS[shot % GALLERY_SHOTS.length].replace("{outfit}", opts.outfit);
  const rules = "Vertical 4:5 photo, realistic, fully clothed, wholesome. No text, no logos, no watermark.";
  return forPhones(await imageCall(`${look} ${room_} ${subject} ${rules}`, SIZES.trainer, [room]), 600);
}

/* ------------------------------------------------------------------ */
/* No-AI fallbacks: the site still builds when OpenAI is unavailable.  */
/* ------------------------------------------------------------------ */

/** Approved, claim-free copy used when the copy call fails. */
export function fallbackCopy(input: CopyInput): SiteCopy {
  const svc = input.services[0] ?? "Reformer";
  const sentence = (t: string) => (t ? t.charAt(0).toLocaleUpperCase("tr") + t.slice(1).replace(/[.\s]*$/, ".") : "");
  return {
    tagline: `${input.district}'de ${input.services.join(", ").toLocaleLowerCase("tr")}.`,
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

