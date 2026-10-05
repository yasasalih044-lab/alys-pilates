import "server-only";
import sharp from "sharp";
import type { Site } from "@/lib/site";

/*
 * Logo → site theme, with plain code (no AI):
 *  - count the logo's colours, ignore its background and near-greys
 *  - light logo ground + saturated colours → light, colourful site
 *  - otherwise → dark editorial site with black-and-white photos
 *  - colour names feed the image prompt ("deep violet, sunflower yellow")
 */

type RGB = [number, number, number];

export type BrandPalette = {
  theme: Site["theme"];
  /** English colour names for image prompts, most dominant first. */
  names: string[];
  /** The logo sits on a light ground (keep the colour logo on a light site). */
  lightGround: boolean;
};

const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function toHsl([r, g, b]: RGB) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s, l };
}

function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] * (1 - t) + b[i] * t) as RGB;

function luminance([r, g, b]: RGB) {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Darken until white text reads on it (buttons). */
function forWhiteText(c: RGB): RGB {
  const { h, s } = toHsl(c);
  let { l } = toHsl(c);
  let out = c;
  while (contrast(out, [255, 255, 255]) < 4.5 && l > 0.08) {
    l -= 0.03;
    out = fromHsl(h, s, l);
  }
  return out;
}

export function colorName([r, g, b]: RGB) {
  const { h, s, l } = toHsl([r, g, b]);
  if (s < 0.15) return l > 0.8 ? "white" : l < 0.2 ? "black" : "soft grey";
  const base =
    h < 12 || h >= 345 ? "red"
    : h < 35 ? "orange"
    : h < 52 ? "golden yellow"
    : h < 68 ? "sunflower yellow"
    : h < 160 ? "green"
    : h < 190 ? "teal"
    : h < 235 ? "blue"
    : h < 262 ? "indigo"
    : h < 292 ? "violet purple"
    : h < 330 ? "magenta pink"
    : "rose pink";
  const tone = l < 0.32 ? "deep " : l > 0.7 ? "soft " : "";
  return `${tone}${base}`;
}

export async function paletteFromLogo(logo: Buffer): Promise<BrandPalette> {
  const { data, info } = await sharp(logo)
    .flatten({ background: "#ffffff" })
    .resize(120, 120, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number): RGB => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [px(1, 1), px(info.width - 2, 1), px(1, info.height - 2), px(info.width - 2, info.height - 2)];
  const ground = mix(mix(corners[0], corners[1], 0.5), mix(corners[2], corners[3], 0.5), 0.5);
  let lightGround = luminance(ground) > 0.6;
  // A transparent logo drawn in white is meant for dark pages, even though it
  // was flattened onto white above.
  const meta = await sharp(logo).metadata();
  if (meta.hasAlpha) {
    const { data: a, info: ai } = await sharp(logo).resize(120, 120, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let lum = 0;
    let n = 0;
    for (let i = 0; i < a.length; i += ai.channels) {
      if (a[i + 3] < 128) continue;
      lum += luminance([a[i], a[i + 1], a[i + 2]]);
      n++;
    }
    if (n && lum / n > 0.7) lightGround = false;
  }

  // Bucket colours (5 bits per channel) and count, skipping the ground and greys.
  const buckets = new Map<string, { sum: RGB; n: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const c: RGB = [data[i], data[i + 1], data[i + 2]];
    if (Math.hypot(c[0] - ground[0], c[1] - ground[1], c[2] - ground[2]) < 48) continue;
    const { s, l } = toHsl(c);
    if (s < 0.22 || l < 0.08 || l > 0.94) continue;
    const key = c.map((v) => v >> 5).join(",");
    const b = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
    b.n++;
    buckets.set(key, b);
  }
  const colours = [...buckets.values()]
    .filter((b) => b.n > 6)
    .sort((a, b) => b.n - a.n)
    .map((b) => b.sum.map((v) => v / b.n) as RGB);

  // Merge near-duplicates so "purple" and "slightly lighter purple" count once.
  const distinct: RGB[] = [];
  for (const c of colours) {
    if (distinct.every((d) => Math.abs(toHsl(d).h - toHsl(c).h) > 18 || Math.abs(toHsl(d).l - toHsl(c).l) > 0.25)) distinct.push(c);
    if (distinct.length === 4) break;
  }

  const names = [...new Set(distinct.map(colorName))];
  const colourful = distinct.length > 0;

  if (lightGround && colourful) {
    const main = distinct[0];
    const { h, s } = toHsl(main);
    const ink = fromHsl(h, Math.min(0.55, s), 0.17);
    const accent = forWhiteText(main);
    const bg = mix([251, 249, 245], main, 0.035);
    return {
      lightGround,
      names,
      theme: {
        bg: hex(bg),
        surface: "#ffffff",
        ink: hex(ink),
        muted: hex(mix(ink, bg, 0.42)),
        line: hex(mix(ink, bg, 0.86)),
        accent: hex(accent),
        mode: "light",
        photos: "color",
      },
    };
  }

  // Dark editorial: graphite page, logo redrawn white, B&W photos, accent from the logo if any.
  const accent = colourful ? distinct.find((c) => toHsl(c).s > 0.4 && toHsl(c).l > 0.35) : undefined;
  return {
    lightGround,
    names: names.length ? names : ["black", "white"],
    theme: {
      bg: "#090909",
      surface: "#141414",
      ink: "#fafafa",
      muted: "#aaaaaa",
      line: "#454545",
      accent: accent ? hex(accent) : "",
      mode: "dark",
      photos: "mono",
    },
  };
}
