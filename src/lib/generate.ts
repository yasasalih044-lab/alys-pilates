import "server-only";
import sharp from "sharp";
import {
  asReference,
  logoContrast,
  logoCutout,
  logoInColour,
  fallbackCopy,
  galleryImage,
  generateCopy,
  heroImage,
  roomAsHero,
  trainerPortrait,
  whiteLogo,
} from "@/lib/ai";
import { buildSite, type BuilderInput } from "@/lib/build-site";
import { colorName, paletteFromLogo, themeForGround, type BrandPalette, type GroundChoice } from "@/lib/palette";
import { pricingServices, type Site } from "@/lib/site";
import { getStoredSite, makeSlug, readUpload, saveSite, saveUpload, type StoredSite } from "@/lib/store";

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

  const palette = await paletteFromLogo(logo, rooms);
  // The owner can pick the page ground ("Sitenin zemini"); auto = the logo's own ground.
  if (input.ground && input.ground !== "auto") palette.theme = themeForGround(palette, input.ground);
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
  const [copy, logos, hero, trainerPhotos, gallery] = await Promise.all([
    generateCopy(copyInput).catch((e) => {
      console.error("copy generation failed, using approved fallback copy", (e as Error).message);
      return fallbackCopy(copyInput);
    }),
    brandLogos(slug, v, logo, palette),
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
    // "Stüdyomuz": each owner photo re-shot in our look; the photo itself if that fails.
    Promise.all(
      rooms.map(async (r, i) => {
        const img = await galleryImage(r, i, { mode, outfit }).catch(async (e) => {
          console.error(`gallery ${i} failed, using the photo`, (e as Error).message);
          return sharp(r).resize(600, 750, { fit: "cover", position: "centre" }).webp({ quality: 76 }).toBuffer();
        });
        return saveUpload(slug, `gallery-${i}-${v}.webp`, img);
      }),
    ),
  ]);

  const site = buildSite(input, copy, { theme: palette.theme, logo: logos.logo, logoOnLight: logos.onLight, icon: logos.icon, hero, trainerPhotos, gallery });
  const stored: StoredSite = {
    ...site,
    _meta: {
      createdAt: opts.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preview: true,
      owner: { studio: input.studio, whatsapp: input.whatsapp, ip: opts.ip },
      input,
      ...(logos.white ? { logoWhite: logos.white } : {}),
    },
  };
  await saveSite(slug, stored);
  console.log(`site saved: ${slug} (${input.studio}, ${input.district}, ${mode}, rooms=${rooms.length}, hero=${hero ?? "library"})`);
  return slug;
}

/**
 * The logo files for a site: the cut-out logo (exact, never redrawn) for light
 * pages, a full-white one for dark pages, and the tab icon. `white` = a white
 * logo this site already has (it does not depend on the ground): reused
 * instead of asking GPT again.
 */
export async function brandLogos(slug: string, v: string, logo: Buffer, palette: BrandPalette, white?: string, fresh = true, quick = false) {
  const mode = palette.theme.mode ?? "dark";
  // The logo alone, cut from its ground by code (never redrawn). It does not
  // depend on the page ground, so a later ground change reuses the stored cut.
  const cutName = palette.framed ? "logo-cut-framed.webp" : "logo-cut.webp";
  const stored = fresh ? null : await readUpload(slug, cutName);
  const cut = stored ?? (await logoCutout(logo, palette.framed ? palette.ground : undefined));
  if (!stored) await saveUpload(slug, cutName, cut);
  // On a light page a logo that is itself light (white lettering) would vanish:
  // use its exact shape in the page's ink instead.
  const onLightImg = (await logoContrast(cut, palette.theme.bg)) < 1.6 && mode === "light" ? await logoInColour(cut, palette.theme.ink) : cut;
  const onLight = await saveUpload(slug, `logo-colour-${v}.webp`, onLightImg);
  // Tab icon: the page's logo, centred on the page colour.
  const icon = await saveUpload(
    slug,
    `icon-${v}.png`,
    await sharp(await sharp(mode === "light" ? onLightImg : await logoInColour(cut, "#ffffff")).resize(84, 84, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer())
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: palette.theme.bg })
      .flatten({ background: palette.theme.bg })
      .png()
      .toBuffer(),
  );
  if (mode === "light") return { logo: onLight, onLight, icon, white };
  if (white) return { logo: white, onLight, icon, white };
  // An edit waits for nobody: the exact white silhouette now, GPT's white logo later (whiteLogoLater).
  if (quick) return { logo: await saveUpload(slug, `logo-white-${v}.webp`, await logoInColour(cut, "#ffffff")), onLight, icon, white: undefined, later: true };
  // Dark page: full-white logo from GPT; if it comes back as a box, the exact
  // white silhouette of the cut-out logo instead.
  const made = await whiteLogo(logo, "image/png")
    .then((w) => saveUpload(slug, `logo-white-${v}.webp`, w))
    .catch(async (e) => {
      console.error("white logo refused, using the cut-out logo in white", (e as Error).message);
      return saveUpload(slug, `logo-white-${v}.webp`, await logoInColour(cut, "#ffffff"));
    });
  return { logo: made, onLight, icon, white: made };
}

/** The white logo a site already has: remembered in _meta, or the logo of a dark site. */
const knownWhite = (s: StoredSite) => s._meta?.logoWhite ?? (s.theme.mode === "dark" && s.brand.logo.includes("/logo-white-") ? s.brand.logo : undefined);

/**
 * The same site on another page ground (form's "Sitenin zemini", or the
 * preview's "Düzenle" later): new colours and logo files, same link, photos
 * and texts untouched. `freshWhite` redraws the white logo too (admin relogo).
 */
export async function siteOnGround(slug: string, site: StoredSite, ground: GroundChoice, opts: { freshWhite?: boolean; quick?: boolean } = {}): Promise<StoredSite & { _later?: boolean }> {
  const input = { ...inputFromSite(site), ground };
  const files = await filesFromStore(slug, site);
  const palette = await paletteFromLogo(files.logo, files.rooms);
  if (ground !== "auto") palette.theme = themeForGround(palette, ground);
  const logos = await brandLogos(slug, Date.now().toString(36), files.logo, palette, opts.freshWhite ? undefined : knownWhite(site), !!opts.freshWhite, !!opts.quick);
  const accent = input.accent === "auto" ? palette.theme.accent : input.accent;
  const logoWhite = logos.white ?? knownWhite(site);
  return {
    ...site,
    theme: { ...palette.theme, accent },
    brand: { ...site.brand, logo: logos.logo, mark: logos.onLight, originalLogo: logos.onLight, logoOnLight: logos.onLight, icon: logos.icon },
    _meta: { ...(site._meta ?? { createdAt: new Date().toISOString(), preview: false }), updatedAt: new Date().toISOString(), input, ...(logoWhite ? { logoWhite } : {}) },
    ...("later" in logos ? { _later: true } : {}),
  };
}

/**
 * After a quick edit put the code-made white logo on a dark ground: asks GPT
 * for the real full-white logo and swaps it in if the site is still dark.
 * `lock` is the edit lock of /api/style, so this never races an edit.
 */
export async function whiteLogoLater(slug: string, lock: Set<string>) {
  const site = await getStoredSite(slug);
  if (!site) return;
  const files = await filesFromStore(slug, site);
  const made = await whiteLogo(files.logo, "image/png")
    .then((w) => saveUpload(slug, `logo-white-${Date.now().toString(36)}.webp`, w))
    .catch((e) => console.error("background white logo failed", (e as Error).message));
  if (!made) return;
  for (let i = 0; i < 60 && lock.has(slug); i++) await new Promise((r) => setTimeout(r, 500));
  if (lock.has(slug)) return;
  lock.add(slug);
  try {
    const now = await getStoredSite(slug);
    if (!now?._meta) return;
    const dark = now.theme.mode === "dark";
    await saveSite(slug, { ...now, brand: dark ? { ...now.brand, logo: made } : now.brand, _meta: { ...now._meta, logoWhite: made } });
  } finally {
    lock.delete(slug);
  }
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
