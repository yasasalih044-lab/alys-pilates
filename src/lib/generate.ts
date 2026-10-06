import "server-only";
import sharp from "sharp";
import {
  asReference,
  colourLogoOnTransparent,
  fallbackCopy,
  generateCopy,
  logoOnDark,
  heroImage,
  roomAsHero,
  trainerPortrait,
  whiteLogo,
} from "@/lib/ai";
import { buildSite, type BuilderInput } from "@/lib/build-site";
import { colorName, paletteFromLogo } from "@/lib/palette";
import { pricingServices, type Site } from "@/lib/site";
import { makeSlug, readUpload, saveSite, saveUpload, type StoredSite } from "@/lib/store";

export type GenerateFiles = { logo: Buffer; rooms: Buffer[]; trainers: (Buffer | null)[] };

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Form input + uploads → a finished preview site on disk.
 * Plain code decides (theme from the logo, section order); AI only writes
 * copy and draws pictures. Every image falls back to the studio's own
 * material, never to another studio's photos.
 */
export async function generateSite(
  input: BuilderInput,
  files: GenerateFiles,
  opts: { slug?: string; ip?: string; createdAt?: string } = {},
): Promise<string> {
  const slug = opts.slug ?? (await makeSlug(input.studio));
  // Versioned file names: /u/ is cached as immutable, so a regenerated image needs a new URL.
  const v = Date.now().toString(36);

  const logo = await sharp(files.logo).rotate().resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const rooms = await Promise.all(files.rooms.slice(0, 3).map(asReference));
  // Originals stay on disk so the site can be regenerated later with better prompts.
  await saveUpload(slug, "logo-src.png", logo);
  await Promise.all(rooms.map((r, i) => saveUpload(slug, `room-${i}.jpg`, r)));
  await Promise.all(files.trainers.map(async (t, i) => (t ? saveUpload(slug, `trainer-src-${i}.jpg`, await asReference(t)) : undefined)));

  // Owner photos also go on the page: centre 4:5 crop (drops phone-story bars), phone-sized.
  const gallery = await Promise.all(
    files.rooms.slice(0, 3).map(async (r, i) =>
      saveUpload(slug, `gallery-${i}-${v}.webp`, await sharp(r).rotate().resize(600, 750, { fit: "cover", position: "centre" }).webp({ quality: 76 }).toBuffer()),
    ),
  );

  const palette = await paletteFromLogo(logo, rooms);
  const mode = palette.theme.mode ?? "dark";
  const accent = input.accent === "auto" ? palette.theme.accent : input.accent;
  const outfit = accent ? colorName(rgb(accent)) : mode === "light" ? "soft sand beige" : "black";

  const copyInput = {
    studio: input.studio,
    district: input.district,
    city: input.city,
    services: input.services.map((s) => s.name),
    trainers: input.trainers,
    sampleReviews: input.reviews.length === 0,
  };
  const [copy, logos, hero, trainerPhotos] = await Promise.all([
    generateCopy(copyInput).catch((e) => {
      console.error("copy generation failed, using approved fallback copy", (e as Error).message);
      return fallbackCopy(copyInput);
    }),
    (async () => {
      const onLight = await saveUpload(slug, `logo-colour-${v}.webp`, await colourLogoOnTransparent(logo));
      if (mode === "light") return { logo: onLight, onLight };
      const white = await whiteLogo(logo, "image/png")
        .then((w) => saveUpload(slug, `logo-white-${v}.webp`, w))
        .catch(async (e) => {
          console.error("white logo failed, keying out the logo ground instead", (e as Error).message);
          return saveUpload(slug, `logo-dark-${v}.webp`, await logoOnDark(logo));
        });
      return { logo: white, onLight };
    })(),
    heroImage({ mode, outfit, colours: palette.names, rooms })
      .then((img) => saveUpload(slug, `hero-${v}.webp`, img))
      .catch(async (e) => {
        console.error("hero generation failed", (e as Error).message);
        return rooms[0] ? saveUpload(slug, `hero-${v}.webp`, await roomAsHero(rooms[0])) : undefined;
      }),
    Promise.all(
      files.trainers.map(async (t, i) => {
        if (!t) return undefined;
        const img = await trainerPortrait(t).catch(async (e) => {
          console.error(`trainer ${i} portrait failed, using the photo`, (e as Error).message);
          return sharp(t).rotate().resize(600, 750, { fit: "cover", position: "attention" }).webp({ quality: 76 }).toBuffer();
        });
        return saveUpload(slug, `trainer-${i}-${v}.webp`, img);
      }),
    ),
  ]);

  const site = buildSite(input, copy, { theme: palette.theme, logo: logos.logo, logoOnLight: logos.onLight, hero, trainerPhotos, gallery });
  const stored: StoredSite = {
    ...site,
    _meta: {
      createdAt: opts.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preview: true,
      owner: { studio: input.studio, whatsapp: input.whatsapp, ip: opts.ip },
      input,
    },
  };
  await saveSite(slug, stored);
  console.log(`site saved: ${slug} (${input.studio}, ${input.district}, ${mode}, rooms=${rooms.length}, hero=${hero ?? "library"})`);
  return slug;
}

/** Rebuilds the form input of an older site that predates `_meta.input`. */
export function inputFromSite(s: StoredSite): BuilderInput {
  if (s._meta?.input) return s._meta.input;
  return {
    studio: s.brand.name,
    district: s.location.district,
    city: s.location.city,
    address: s.location.address,
    whatsapp: s.contact.whatsapp,
    instagram: s.contact.instagram,
    accent: "auto",
    services: pricingServices(s as Site).map((svc) => ({
      name: svc.name,
      packages: svc.packages.map((p) => ({ sessions: parseInt(p.name, 10) || 0, price: p.price })).filter((p) => p.sessions > 0),
    })),
    trainers: (s.trainers?.items ?? []).map((t) => ({ name: t.name, info: t.bio })),
    reviews: s.testimonials.sample ? [] : s.testimonials.items.map((r) => ({ name: r.name, text: r.body })),
  };
}

/** Reads back what a site was built from (newer names first, then the first-version names). */
export async function filesFromStore(slug: string, s: StoredSite): Promise<GenerateFiles> {
  const first = async (...names: string[]): Promise<Buffer | null> => {
    for (const n of names) {
      const b = await readUpload(slug, n);
      if (b) return b;
    }
    return null;
  };
  const logo = await first("logo-src.png", "logo-original.png", "logo-colour.webp");
  if (!logo) throw new Error(`no logo stored for ${slug}`);
  const rooms: Buffer[] = [];
  for (const i of [0, 1, 2]) {
    const b = await first(`room-${i}.jpg`);
    if (b) rooms.push(b);
  }
  const trainers = await Promise.all((s.trainers?.items ?? []).map((_, i) => first(`trainer-src-${i}.jpg`, `trainer-${i}.webp`)));
  return { logo, rooms, trainers };
}
