import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import seed from "@/data/site.json";
import payluna from "@/data/payluna.json";
import type { Site } from "@/lib/site";

// Generated sites and their uploads live on disk. On Coolify, mount a
// persistent volume at DATA_DIR so previews survive redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const SLUG = /^[a-z0-9-]{2,64}$/;
const FILE = /^[a-z0-9-]{1,40}\.(webp|png|jpg)$/;

export type SiteMeta = {
  createdAt: string;
  /** Preview built by Site Yapıcı (shows the "bu siteyi istiyorum" bar). */
  preview: boolean;
  owner?: { studio: string; whatsapp: string; ip?: string };
};

export type StoredSite = Site & { _meta?: SiteMeta };

/** The approved ALYS export doubles as the public example site. */
const SEEDS: Record<string, StoredSite> = {
  "alys-pilates": seed as StoredSite,
  "payluna": { ...(payluna as StoredSite), _meta: { createdAt: "2026-10-05T00:00:00Z", preview: true } },
};

export async function getSite(slug: string): Promise<StoredSite | null> {
  if (!SLUG.test(slug)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "sites", `${slug}.json`), "utf8"));
  } catch {
    return SEEDS[slug] ?? null;
  }
}

export async function saveSite(slug: string, site: StoredSite) {
  if (!SLUG.test(slug)) throw new Error("bad slug");
  const dir = path.join(DATA_DIR, "sites");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.json`), JSON.stringify(site, null, 2));
}

/** Stores one image for a site and returns its public URL. */
export async function saveUpload(slug: string, name: string, data: Buffer) {
  if (!SLUG.test(slug) || !FILE.test(name)) throw new Error("bad upload path");
  const dir = path.join(DATA_DIR, "uploads", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  return `/u/${slug}/${name}`;
}

export async function readUpload(slug: string, name: string) {
  if (!SLUG.test(slug) || !FILE.test(name)) return null;
  try {
    return await fs.readFile(path.join(DATA_DIR, "uploads", slug, name));
  } catch {
    return null;
  }
}

export async function slugExists(slug: string) {
  return (await getSite(slug)) !== null;
}

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

/** "ALYS Pilates Çekmeköy" → "alys-pilates-cekmekoy" (+ short suffix if taken). */
export async function makeSlug(name: string) {
  const base =
    name
      .toLocaleLowerCase("tr")
      .replace(/[çğıİöşü]/g, (c) => TR[c] ?? c)
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "studyo";
  if (!(await slugExists(base))) return base;
  for (;;) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await slugExists(candidate))) return candidate;
  }
}
