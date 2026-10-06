import "server-only";
import seed from "@/data/site.json";
import type { PricedService, SectionKey, Site } from "@/lib/site";
import type { SiteCopy } from "@/lib/ai";
import { heroLines } from "@/lib/hero-lines";

export type BuilderInput = {
  studio: string;
  district: string;
  city: string;
  address: string;
  whatsapp: string;
  instagram: string;
  /** "auto" = from the logo; "" = white buttons; otherwise a hex colour. */
  accent: string;
  services: { name: string; packages: { sessions: number; price: number | null }[] }[];
  trainers: { name: string; info: string }[];
  reviews: { name: string; text: string }[];
};

export type BuilderAssets = {
  theme: Site["theme"];
  logo: string;
  logoOnLight: string;
  icon?: string;
  hero?: string;
  trainerPhotos: (string | undefined)[];
  /** Owner's studio photos, cropped for the "Stüdyomuz" strip. */
  gallery?: string[];
};

/** "betül yılmazer" → "Betül Yılmazer" (Turkish casing). Brand names are left as typed. */
const titleCase = (t: string) =>
  t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
    .join(" ");

/**
 * Form + AI copy + processed images → one site.json.
 * Order the owner asked for: hero → flow → reviews → trainers → packages.
 */
export function buildSite(input: BuilderInput, copy: SiteCopy, assets: BuilderAssets): Site {
  const base = structuredClone(seed) as Site;
  const district = titleCase(input.district);
  input = { ...input, city: titleCase(input.city) };
  const place = [input.address, district, input.city].filter(Boolean).join(", ");
  const initials = input.studio
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");

  const services: PricedService[] = input.services.map((s) => ({
    name: s.name,
    packages: [...s.packages]
      .sort((a, b) => a.sessions - b.sessions)
      .map((p, i, all) => ({
        name: `${p.sessions} seans`,
        price: p.price,
        popular: all.length >= 3 && i === Math.floor(all.length / 2),
      })),
  }));

  const realReviews = input.reviews.map((r) => ({ name: titleCase(r.name), meta: input.services[0]?.name ?? "Öğrenci", body: r.text }));
  const reviews = realReviews.length ? realReviews : copy.reviews;
  const hasTrainers = input.trainers.length > 0;

  const sections: SectionKey[] = ["hero", "process"];
  if (assets.gallery?.length) sections.push("gallery");
  if (reviews.length) sections.push("testimonials");
  if (hasTrainers) sections.push("trainers");
  sections.push("pricing");

  const accent = input.accent === "auto" ? assets.theme.accent : input.accent;

  return {
    ...base,
    brand: {
      name: input.studio,
      wordmark: input.studio.toLocaleLowerCase("tr"),
      monogram: `${initials}.`,
      logo: assets.logo,
      mark: assets.logoOnLight,
      originalLogo: assets.logoOnLight,
      logoOnLight: assets.logoOnLight,
      icon: assets.icon,
      role: "Reformer Pilates Stüdyosu",
      tagline: copy.tagline,
    },
    theme: { ...assets.theme, accent },
    images: {
      ...base.images,
      hero: assets.hero ?? base.images.hero,
      heroAlt: `${input.studio} stüdyosunda reformerın yanında duran eğitmen`,
    },
    location: {
      district,
      city: input.city,
      address: input.address,
      mapQuery: input.address ? place : `${input.studio}, ${district}, ${input.city}`,
    },
    contact: { whatsapp: input.whatsapp, instagram: input.instagram, phone: "" },
    hero: {
      ...base.hero,
      label: `Reformer Pilates · ${district}`,
      titleLines: heroLines(input.studio, district),
      description: "",
      secondaryCta: "Paketleri gör",
    },
    testimonials: {
      ...base.testimonials,
      sample: realReviews.length === 0,
      items: reviews,
    },
    gallery: assets.gallery?.length
      ? { label: "Stüdyomuz", titleLines: ["Seni bekleyen", "salonumuz."], images: assets.gallery }
      : undefined,
    trainers: hasTrainers
      ? {
          label: "Eğitmenlerimiz",
          titleLines: ["Seni tanıyan", "eğitmenlerle çalış."],
          items: input.trainers.map((t, i) => ({
            name: titleCase(t.name),
            title: copy.trainerBios[i]?.title ?? "Pilates Eğitmeni",
            bio: copy.trainerBios[i]?.bio ?? "",
            photo: assets.trainerPhotos[i],
          })),
        }
      : undefined,
    pricing: {
      label: "Paketler",
      titleLines: ["Ritmine uygun", "bir paket."],
      sample: false,
      cta: "Bu paketi sor",
      services,
    },
    marquee: copy.marquee,
    sections,
  };
}

/** "0532 123 45 67", "+90 532…", "532…" → "905321234567"; "" if it is not a TR mobile. */
export function normalizeWhatsapp(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  return /^905\d{9}$/.test(d) ? d : "";
}
