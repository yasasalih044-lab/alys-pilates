import raw from "@/data/site.json";

export type NavLink = { label: string; href: string };
type Lines = string[];
type TitleBody = { title: string; body: string };

export type Site = {
  brand: {
    name: string;
    wordmark: string;
    monogram: string;
    logo: string;
    mark: string;
    originalLogo: string;
    /** Full-colour version for light backgrounds; `logo` is the white one for this dark template. */
    logoOnLight: string;
    role: string;
    tagline: string;
  };
  theme: { bg: string; surface: string; ink: string; muted: string; line: string; accent: string };
  images: {
    hero: string;
    heroAlt: string;
    studio: string;
    studioAlt: string;
    detail: string;
    detailAlt: string;
    texture: string;
  };
  location: { district: string; city: string; address: string; mapQuery: string };
  contact: { whatsapp: string; instagram: string; phone: string };
  nav: NavLink[];
  navCta: string;
  hero: {
    label: string;
    titleLines: Lines;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    /** Opens the studio's location (location.mapQuery) in Google Maps. */
    locationCta: string;
  };
  strip: { lead: string; from: string; to: string; tail: string };
  services: {
    label: string;
    titleLines: Lines;
    intro: string;
    cta: string;
    items: { name: string; description: string; image: string; alt: string }[];
  };
  about: { label: string; titleLines: Lines; body: string; note: string; tags: string[]; link: string };
  process: { label: string; titleLines: Lines; intro: string; items: TitleBody[] };
  testimonials: {
    label: string;
    titleLines: Lines;
    intro: string;
    /** true = placeholder copy; shows a note until real reviews replace it. */
    sample: boolean;
    items: { name: string; meta: string; body: string }[];
  };
  perspective: {
    label: string;
    titleLines: Lines;
    intro: string;
    caption: string;
    kicker: string;
    headline: string;
    headlineEm: string;
    items: TitleBody[];
    link: string;
  };
  pricing: {
    label: string;
    titleLines: Lines;
    /** true = placeholder prices; shows a note until the studio's real prices replace them. */
    sample: boolean;
    periods: string[];
    unit: string;
    cta: string;
    /** prices[i] belongs to periods[i]; null = "ask for price". */
    plans: { name: string; note: string; prices: (number | null)[]; popular: boolean }[];
  };
  faq: { label: string; title: string; intro: string; items: { q: string; a: string }[] };
  booking: {
    label: string;
    titleLines: Lines;
    body: string;
    cardKicker: string;
    cardTitleLines: Lines;
    steps: string[];
    button: string;
    note: string;
  };
  marquee: string[];
  sections: SectionKey[];
};

export type SectionKey =
  | "hero"
  | "strip"
  | "services"
  | "about"
  | "process"
  | "perspective"
  | "testimonials"
  | "pricing"
  | "faq"
  | "booking";

// Later this comes from Supabase by hostname; for now one local file.
export const site = raw as Site;

/** Best available contact link: WhatsApp, then Instagram, then the booking section. */
export function contactHref(s: Site, message?: string): string {
  const digits = s.contact.whatsapp.replace(/\D/g, "");
  if (digits) {
    const text = message ?? `Merhaba, ${s.brand.name} için bilgi almak istiyorum.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  if (s.contact.instagram) {
    return `https://instagram.com/${s.contact.instagram.replace(/^@/, "")}`;
  }
  return "#iletisim";
}

export function isExternal(href: string) {
  return href.startsWith("http");
}

export function mapsHref(s: Site) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location.mapQuery)}`;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value) + " ₺";
}
