import "server-only";
import seed from "@/data/site.json";
import type { SectionKey, Site } from "@/lib/site";
import type { SiteCopy } from "@/lib/ai";

/** Class types the form offers, with their default library photos. */
export const CLASSES = {
  group: {
    name: "Reformer grup",
    image: "/images/class-group.webp",
    alt: "Reformer aletlerinde yan yana çalışan kadınlar",
    period: "Grup ders",
  },
  private: {
    name: "Özel ders",
    image: "/images/class-private.webp",
    alt: "Eğitmen eşliğinde reformer üzerinde birebir ders",
    period: "Özel ders",
  },
  duet: {
    name: "Düet",
    image: "/images/class-duet.webp",
    alt: "İki reformer üzerinde aynı hareketi yapan iki kadın",
    period: null,
  },
} as const;

export type ClassKey = keyof typeof CLASSES;

export type BuilderInput = {
  studio: string;
  district: string;
  city: string;
  address: string;
  whatsapp: string;
  instagram: string;
  accent: string;
  classes: ClassKey[];
  /** prices[period][i] for 4 / 8 / 12 lessons a month; null = ask. */
  prices: Partial<Record<"group" | "private", (number | null)[]>>;
};

export type BuilderAssets = {
  logo: string;
  originalLogo: string;
  hero?: string;
  studio?: string;
  detail?: string;
};

const PLAN_NAMES = [
  { name: "Ayda 4 ders", note: "Haftada 1" },
  { name: "Ayda 8 ders", note: "Haftada 2" },
  { name: "Ayda 12 ders", note: "Haftada 3" },
];

/** Turns the form, the AI copy and the processed images into one site.json. */
export function buildSite(input: BuilderInput, copy: SiteCopy, assets: BuilderAssets): Site {
  const base = structuredClone(seed) as Site;
  const district = input.district;
  const place = [input.address, district, input.city].filter(Boolean).join(", ");
  const initials = input.studio
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");

  const pricedPeriods = (["group", "private"] as const).filter((k) => input.classes.includes(k));
  const hasPricing = pricedPeriods.length > 0;

  const sections: SectionKey[] = ["hero", "services", "about", "process", "perspective"];
  if (hasPricing) sections.push("pricing");
  sections.push("faq", "booking");

  return {
    ...base,
    brand: {
      name: input.studio,
      wordmark: input.studio.toLocaleLowerCase("tr"),
      monogram: `${initials}.`,
      logo: assets.logo,
      mark: assets.originalLogo,
      originalLogo: assets.originalLogo,
      logoOnLight: assets.originalLogo,
      role: "Reformer Pilates Stüdyosu",
      tagline: copy.tagline,
    },
    theme: { ...base.theme, accent: input.accent },
    images: {
      ...base.images,
      hero: assets.hero ?? base.images.hero,
      heroAlt: assets.hero ? `${input.studio} stüdyosundan bir kare` : base.images.heroAlt,
      studio: assets.studio ?? base.images.studio,
      studioAlt: assets.studio ? `${input.studio} stüdyosunda reformer` : base.images.studioAlt,
      detail: assets.detail ?? base.images.detail,
      detailAlt: assets.detail ? `${input.studio} stüdyosundan detay` : base.images.detailAlt,
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
      titleLines: copy.heroTitleLines,
      description: "",
    },
    services: {
      ...base.services,
      titleLines: copy.servicesTitleLines,
      intro: copy.servicesIntro,
      items: input.classes.map((k, i) => ({
        name: CLASSES[k].name,
        description: copy.classDescriptions[i] ?? "",
        image: CLASSES[k].image,
        alt: CLASSES[k].alt,
      })),
    },
    about: { ...base.about, label: input.studio, titleLines: copy.aboutTitleLines },
    perspective: {
      ...base.perspective,
      caption: `${input.studio} / Reformer`,
      kicker: `REFORMER PILATES · ${district.toLocaleUpperCase("tr")}`,
      headline: copy.perspectiveHeadline,
      headlineEm: copy.perspectiveHeadlineEm,
      items: copy.principles,
    },
    testimonials: { ...base.testimonials, sample: false, items: [] },
    pricing: {
      ...base.pricing,
      sample: false,
      periods: pricedPeriods.map((k) => CLASSES[k].period!),
      plans: PLAN_NAMES.map((p, i) => ({
        ...p,
        prices: pricedPeriods.map((k) => input.prices[k]?.[i] ?? null),
        popular: i === 1,
      })),
    },
    faq: { ...base.faq, items: copy.faq },
    booking: {
      ...base.booking,
      titleLines: copy.bookingTitleLines,
      body: copy.bookingBody,
      cardTitleLines: copy.bookingCardTitleLines,
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
