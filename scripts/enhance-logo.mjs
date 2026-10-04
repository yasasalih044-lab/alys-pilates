// Upgrades an uploaded studio logo with gpt-image-2 (images/edits).
// Default mode "exact": the SAME logo, redrawn as a crisp high-resolution master;
// "white": the same logo as one pure-white mark on transparency (for dark sites);
// nothing is redesigned. "redesign" mode keeps the 10 brand directions.
// Usage: node scripts/enhance-logo.mjs <logo> <outDir> [--mode exact|white|redesign] [--shape circle|none]
//        [--name "ALYS"] [--tagline "Pilates Studio"] [--color "#ff2bd6"] [--type Pilates]
//        [--directions 1,3,8] [--on dark|light]
// Needs OPENAI_API_KEY. Writes <outDir>/logo-<n>.png (transparent background).
// gpt-image-2 has no transparent output, so the logo is drawn on solid black (or
// white) and that ground is converted to alpha afterwards.
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const RULES = (b) => `RULES
- Square 1:1 image, high resolution. Exactly one logo, centered, with generous empty space around it, on a perfectly flat solid ${b.on === "dark" ? "pure black (#000000)" : "pure white (#FFFFFF)"} background with nothing else on it.
- The logo will sit on a ${b.on === "dark" ? "near-black website header, so draw it in off-white / cream ink" : "light website, so draw it in deep ink"}${b.color ? `, with ${b.color} allowed only as a tiny accent` : ""}.
- Flat, clean vector-style logo: crisp edges, balanced spacing, no 3D, no mockup, no shadows, no gradients, no background shapes.
- Text: "${b.name}"${b.tagline ? ` and the tagline "${b.tagline}"` : ""} spelled exactly, letter by letter, including Turkish characters. No other text.${b.tagline ? "" : " No tagline."}
- Mood: ${b.type === "Spor Salonu" ? "strong and confident, but still premium and minimal" : "soft, feminine, calm elegance"}.
- Keep the brand's identity: the same name and, where the direction calls for it, the idea of the original symbol, redrawn at a much higher level.
- Never a sheet, grid or collage of logos.`;

const DIRECTIONS = {
  1: "Premium redraw: same layout and symbol as the original, redrawn cleanly with better typography and spacing.",
  2: "Serif wordmark: thin high-contrast serif with wide letter-spacing, small spaced tagline.",
  3: "Monogram: the brand's initials as an elegant monogram inside a thin circle, the name small below.",
  4: "Arch: the name inside or under a minimalist arch outline.",
  5: "Fine-line figure: a single-line drawing of a person in a pilates pose, above the wordmark.",
  6: "Script + serif: the name in a refined script, the tagline in spaced serif capitals.",
  7: "Round badge: the name along a thin circular border, a small symbol in the center.",
  8: "Geometric minimal: thin geometric sans with a simple abstract mark (circle, line or arc).",
  9: "Stacked lockup: small symbol on top, the name, thin divider lines and the tagline below.",
  10: "Bold premium: a heavier, confident wordmark with a simplified version of the original symbol.",
};

const EXACT = `Recreate the attached logo as a pixel-perfect, high-resolution master file.
It must be IDENTICAL to the attached image: the same symbol and shapes, the same text with the same letterforms, letter case, stroke weights, proportions, spacing and positions, the same colors, and the same background.
Do NOT redesign, restyle, modernize, simplify, add, remove, translate or reinterpret anything. No new text, no tagline, no extra shapes.
Only improve the quality: perfectly crisp, clean, smooth vector-like edges, no blur, no noise, no compression artifacts.
Square 1:1, the logo centered and filling the frame the same way as the original.`;

const WHITE = `Recreate the attached logo as a single-color WHITE version for a black website header.
The logo must stay IDENTICAL: the same symbol, the same text with the same letterforms and letter case, the same stroke weights, proportions, spacing and positions. Do NOT redesign, restyle, add, remove or reinterpret anything.
Color rule: every letter, line, outline and symbol of the logo is drawn in pure white (#FFFFFF). Light background fills inside the logo (badge discs, boxes, plates) are removed, so the letters and lines stand on their own. Everything that is not the logo is solid pure black (#000000). No gray, no gradients, no other colors.
Perfectly crisp, clean, vector-like edges. Square 1:1, the logo centered with a little empty space around it.`;

/**
 * Site background is dark → one pure-white logo with a transparent background
 * (gpt-image-2 draws it white on black, the black becomes alpha).
 */
export async function whiteLogo({ file }) {
  const bytes = await readFile(file);
  const ext = extname(file).slice(1).replace("jpg", "jpeg") || "png";
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new Blob([bytes], { type: `image/${ext}` }), basename(file));
  form.append("prompt", WHITE);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
  // Force pure white: brightness becomes alpha, colour becomes #fff.
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
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

/** Same logo, higher quality. shape "circle" cuts a round badge out of its background. */
export async function upscaleLogoExact({ file, shape = "none" }) {
  const bytes = await readFile(file);
  const ext = extname(file).slice(1).replace("jpg", "jpeg") || "png";
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new Blob([bytes], { type: `image/${ext}` }), basename(file));
  form.append("prompt", EXACT);
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
  const png = Buffer.from(json.data[0].b64_json, "base64");
  return shape === "circle" ? cutCircle(png) : png;
}

/** Finds the light disc on a dark ground and returns it as a transparent round PNG. */
export async function cutCircle(png) {
  const { data, info } = await sharp(png).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  let [minX, minY, maxX, maxY] = [info.width, info.height, 0, 0];
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] > 200) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const size = Math.min(maxX - minX, maxY - minY) + 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const left = Math.max(0, Math.round(cx - size / 2));
  const top = Math.max(0, Math.round(cy - size / 2));
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 0.5}" fill="#fff"/></svg>`);
  return sharp(png)
    .extract({ left, top, width: size, height: size })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function enhanceLogo({ file, brand, direction = 1 }) {
  const bytes = await readFile(file);
  const ext = extname(file).slice(1).replace("jpg", "jpeg") || "png";
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", new Blob([bytes], { type: `image/${ext}` }), basename(file));
  form.append(
    "prompt",
    `GOAL\nThe attached image is the brand's current logo. Create one upgraded, luxury, Pinterest-style version of it: minimal, airy, refined and timeless, like a boutique studio's brand identity.\n\n${RULES(brand)}\n\nDIRECTION\n${DIRECTIONS[direction]}`,
  );
  form.append("size", "1024x1024");
  form.append("quality", "high");
  form.append("output_format", "png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json.error ?? json)}`);
  return groundToAlpha(Buffer.from(json.data[0].b64_json, "base64"), brand.on);
}

/** Turns the solid black (dark) or white (light) ground into transparency, un-premultiplying colour, then trims. */
export async function groundToAlpha(png, on = "dark") {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    let a = on === "dark" ? Math.max(r, g, b) : 255 - Math.min(r, g, b);
    a = a < 14 ? 0 : Math.min(255, Math.round(((a - 14) * 255) / 241));
    if (a === 0) {
      data[i + 3] = 0;
      continue;
    }
    const k = 255 / Math.max(a, 1);
    if (on === "dark") {
      data[i] = Math.min(255, r * k);
      data[i + 1] = Math.min(255, g * k);
      data[i + 2] = Math.min(255, b * k);
    } else {
      data[i] = Math.max(0, 255 - (255 - r) * k);
      data[i + 1] = Math.max(0, 255 - (255 - g) * k);
      data[i + 2] = Math.max(0, 255 - (255 - b) * k);
    }
    data[i + 3] = a;
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).png().toBuffer();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, outDir, ...rest] = process.argv.slice(2);
  const arg = (k, d) => {
    const i = rest.indexOf(`--${k}`);
    return i >= 0 ? rest[i + 1] : d;
  };
  const brand = {
    name: arg("name"),
    tagline: arg("tagline", ""),
    color: arg("color", ""),
    type: arg("type", "Pilates"),
    on: arg("on", "dark"),
  };
  if (!file || !outDir) {
    console.error("Usage: node scripts/enhance-logo.mjs <logo> <outDir> [--mode exact|redesign] [...]");
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  if (arg("mode", "exact") === "white") {
    await writeFile(join(outDir, "logo-white.png"), await whiteLogo({ file }));
    console.log("logo-white.png ok");
    process.exit(0);
  }
  if (arg("mode", "exact") === "exact") {
    const png = await upscaleLogoExact({ file, shape: arg("shape", "none") });
    await writeFile(join(outDir, "logo.png"), png);
    console.log("logo.png ok");
    process.exit(0);
  }
  if (!brand.name) {
    console.error("--name is required in redesign mode");
    process.exit(1);
  }
  const dirs = arg("directions", "1").split(",").map(Number);
  await Promise.all(
    dirs.map(async (d) => {
      try {
        const png = await enhanceLogo({ file, brand, direction: d });
        await writeFile(join(outDir, `logo-${d}.png`), png);
        console.log(`logo-${d}.png ok`);
      } catch (e) {
        console.error(`logo-${d} failed: ${e.message}`);
      }
    }),
  );
}
