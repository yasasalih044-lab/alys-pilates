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
  /** The logo is a badge on a different-coloured square: cut that frame away. */
  framed: boolean;
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

/** Most frequent saturated colours of an image (5-bit buckets), skipping its ground colour. */
async function dominantColours(img: Buffer, ground: RGB | null, minS: number) {
  const { data, info } = await sharp(img).flatten({ background: "#ffffff" }).resize(120, 120, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { sum: RGB; n: number }>();
  let lum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const c: RGB = [data[i], data[i + 1], data[i + 2]];
    lum += luminance(c);
    count++;
    if (ground && Math.hypot(c[0] - ground[0], c[1] - ground[1], c[2] - ground[2]) < 48) continue;
    const { s, l } = toHsl(c);
    if (s < minS || l < 0.1 || l > 0.94) continue;
    const key = c.map((v) => v >> 5).join(",");
    const b = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
    b.n++;
    buckets.set(key, b);
  }
  const colours = [...buckets.values()]
    .filter((b) => b.n > 6)
    .sort((x, y) => y.n - x.n)
    .map((b) => b.sum.map((v) => v / b.n) as RGB);
  // Merge near-duplicates so "purple" and "slightly lighter purple" count once.
  const distinct: RGB[] = [];
  for (const c of colours) {
    if (distinct.every((d) => Math.abs(toHsl(d).h - toHsl(c).h) > 18 || Math.abs(toHsl(d).l - toHsl(c).l) > 0.25)) distinct.push(c);
    if (distinct.length === 4) break;
  }
  return { colours: distinct, meanLum: count ? lum / count : 0.5 };
}

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Largest flat colour area of a raw image (4-bit buckets) and its share of the pixels. */
function mostFrequent(data: Buffer, channels: number) {
  const buckets = new Map<string, { sum: RGB; n: number }>();
  for (let i = 0; i < data.length; i += channels) {
    const c: RGB = [data[i], data[i + 1], data[i + 2]];
    const key = c.map((v) => v >> 4).join(",");
    const b = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    b.sum = [b.sum[0] + c[0], b.sum[1] + c[1], b.sum[2] + c[2]];
    b.n++;
    buckets.set(key, b);
  }
  const best = [...buckets.values()].sort((x, y) => y.n - x.n)[0];
  return { colour: best.sum.map((v) => v / best.n) as RGB, share: best.n / (data.length / channels) };
}

/** A pale brand colour (pastel pink on white) → the same hue, vivid enough to be a button. */
function deepen(c: RGB, bg: RGB): RGB {
  const { h, s } = toHsl(c);
  let { l } = toHsl(c);
  let out = fromHsl(h, Math.max(s, 0.62), l);
  while (contrast(out, bg) < 2.4 && l > 0.2) {
    l -= 0.02;
    out = fromHsl(h, Math.max(s, 0.62), l);
  }
  return out;
}

/** Lighten until it stands out on a dark page (buttons, highlights). */
function forDarkPage(c: RGB, bg: RGB): RGB {
  const { h, s } = toHsl(c);
  let { l } = toHsl(c);
  let out = c;
  while (contrast(out, bg) < 4.5 && l < 0.85) {
    l += 0.03;
    out = fromHsl(h, Math.max(s, 0.55), l);
  }
  return out;
}

/**
 * Logo (+ studio photos when the logo has no colour) → site theme.
 * Every generated site gets colour photos; only the page tone changes:
 *  - logo on a light ground → light page in the logo's colours
 *  - logo on a dark ground → dark page tinted with that ground (navy, plum…) and the logo colour as accent
 */
export async function paletteFromLogo(logo: Buffer, rooms: Buffer[] = []): Promise<BrandPalette> {
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
  const frame = mix(mix(corners[0], corners[1], 0.5), mix(corners[2], corners[3], 0.5), 0.5);
  // The ground is the colour the logo is drawn on: usually the corners, but a
  // badge (white circle on a dark square, like Perifit) is drawn on the badge.
  const top = mostFrequent(data, info.channels);
  const ground = top.share > 0.35 && dist(top.colour, frame) > 60 ? top.colour : frame;
  let lightGround = luminance(ground) > 0.6;
  const framed = ground !== frame;
  let transparent = false;
  // A transparent logo drawn in white is meant for dark pages, even though it
  // was flattened onto white above.
  const meta = await sharp(logo).metadata();
  if (meta.hasAlpha) {
    const { data: a, info: ai } = await sharp(logo).resize(120, 120, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let lum = 0;
    let n = 0;
    let clear = 0;
    for (let i = 0; i < a.length; i += ai.channels) {
      if (a[i + 3] < 128) {
        clear++;
        continue;
      }
      lum += luminance([a[i], a[i + 1], a[i + 2]]);
      n++;
    }
    transparent = clear > (a.length / ai.channels) * 0.2;
    if (transparent && n && lum / n > 0.7) lightGround = false;
  }

  const logoColours = (await dominantColours(logo, ground, 0.22)).colours;
  // A black-and-white logo borrows its colours from the studio photos.
  let roomColours: RGB[] = [];
  if (!logoColours.length && rooms.length) {
    const seen = await Promise.all(rooms.slice(0, 3).map((r) => dominantColours(r, null, 0.35)));
    roomColours = seen.flatMap((x) => x.colours).slice(0, 3);
  }
  const brand = logoColours.length ? logoColours : roomColours;
  const names = [...new Set(brand.map(colorName))];

  if (lightGround) {
    const main = brand[0];
    if (!main) {
      return {
        lightGround,
      framed,
        names: ["black", "white"],
        theme: { bg: "#faf8f5", surface: "#ffffff", ink: "#1c1b1a", muted: "#77736e", line: "#e3dfd9", accent: "", mode: "light", photos: "color" },
      };
    }
    const { h, s } = toHsl(main);
    const ink = fromHsl(h, Math.min(0.55, s), 0.17);
    // The owner's colour as is (button text switches to dark/white by contrast);
    // only a colour that would vanish on the page gets darkened.
    const accent = contrast(main, ground) < 1.8 ? deepen(main, ground) : main;
    const bg = ground;
    return {
      lightGround,
      framed,
      names,
      theme: {
        bg: hex(bg),
        surface: hex(luminance(bg) > 0.9 ? mix(bg, main, 0.03) : mix(bg, [255, 255, 255], 0.5)),
        ink: hex(ink),
        muted: hex(mix(ink, bg, 0.42)),
        line: hex(mix(ink, bg, 0.86)),
        accent: hex(accent),
        mode: "light",
        photos: "color",
      },
    };
  }

  // Dark page: tint it with the logo's own dark ground (e.g. Therapia's navy),
  // or faintly with the brand colour; accent = the logo colour, lifted to read.
  const g = toHsl(ground);
  const tint = !transparent && g.s > 0.15 && g.l < 0.35 ? ground : brand[0];
  // An opaque logo ground is the page colour as is ("logonun zemini = sitenin zemini").
  const own = !transparent && luminance(ground) < 0.2;
  const bg: RGB = own ? ground : tint ? fromHsl(toHsl(tint).h, Math.min(0.55, Math.max(0.25, toHsl(tint).s)), 0.075) : [9, 9, 9];
  const surface: RGB = own ? mix(ground, [255, 255, 255], 0.05) : tint ? fromHsl(toHsl(tint).h, Math.min(0.45, Math.max(0.2, toHsl(tint).s)), 0.115) : [20, 20, 20];
  const accentBase = [...brand].sort((x, y) => toHsl(y).s - toHsl(x).s)[0];
  const accent = accentBase ? forDarkPage(accentBase, bg) : null;
  const ink = accent ? mix([247, 248, 250], accent, 0.03) : ([250, 250, 250] as RGB);
  return {
    lightGround,
    framed,
    names: names.length ? names : ["black", "white"],
    theme: {
      bg: hex(bg),
      surface: hex(surface),
      ink: hex(ink),
      muted: hex(mix(ink, bg, 0.38)),
      line: hex(mix(ink, bg, 0.74)),
      accent: accent ? hex(accent) : "",
      mode: "dark",
      photos: "color",
    },
  };
}
