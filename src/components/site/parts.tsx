// Small building blocks shared by every style (Editoryal's section renderers in
// site-page.tsx and the Lüks / Modern / Sade layouts). Server components only.
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { contactHref, isExternal, mapsHref, type Site } from "@/lib/site";

export function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  );
}

export function Ext({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const ext = isExternal(href);
  return (
    <a href={href} className={className} target={ext ? "_blank" : undefined} rel={ext ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  );
}

export function Lines({ lines }: { lines: string[] }) {
  return lines.map((l, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {l}
    </span>
  ));
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");

export const pad2 = (i: number) => String(i + 1).padStart(2, "0");

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const roman = (i: number) => ROMAN[i] ?? String(i + 1);

/** The approved two-line hero title with the shimmer sweep (same markup in every style). */
export function HeroTitle({ s }: { s: Site }) {
  return (
    <h1 className="shimmer" aria-label={s.hero.titleLines.join(" ")}>
      {s.hero.titleLines.map((l, i) => (
        <span key={i} className="shimmer-line" aria-hidden style={{ "--shimmer-delay": `${1.2 + i * 0.35}s` } as CSSProperties}>
          {l}
        </span>
      ))}
    </h1>
  );
}

/** Exactly two hero actions: trial lesson on the studio's WhatsApp, then the map. */
export function HeroActions({ s, secondaryClass = "button button-ghost" }: { s: Site; secondaryClass?: string }) {
  return (
    <div className="hero-actions">
      <Ext href={contactHref(s)} className="button">
        {s.hero.primaryCta}
        <span>
          <ArrowUpRight />
        </span>
      </Ext>
      <Ext href={mapsHref(s)} className={secondaryClass}>
        {s.hero.locationCta}
        <span>
          <MapPin />
        </span>
      </Ext>
    </div>
  );
}

/** Closing word marquee (`.brand-marquee .marquee-track`). `sep` replaces the star separator. */
export function Marquee({ s, sep }: { s: Site; sep?: ReactNode }) {
  const group = (hidden: boolean) => (
    <div className="marquee-group" aria-hidden={hidden || undefined}>
      {s.marquee.map((w) => (
        <span key={w} style={{ display: "contents" }}>
          <span>{w}</span>
          <span className="marquee-star" aria-hidden>
            {sep ?? <Star />}
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <section className="brand-marquee" aria-label={s.marquee.join(", ")}>
      <div className="marquee-window">
        <div className="marquee-track">
          {group(false)}
          {group(true)}
        </div>
      </div>
    </section>
  );
}

type Review = { name: string; meta: string; body: string };

/** Repeats the list until it has at least `min` items, so a short list still fills a moving row. */
export function fill<T>(items: T[], min = 6): T[] {
  if (!items.length) return items;
  const out = [...items];
  while (out.length < min) out.push(...items);
  return out;
}

/**
 * One moving row/column of review cards: `.tm-row > .tm-track > .tm-group` × 2
 * (the CSS loop translates by -50%). Always running, never paused.
 */
export function ReviewTrack({
  items,
  card,
  duration,
  reverse = false,
  min = 6,
  className = "",
}: {
  items: Review[];
  card: (r: Review, key: string) => ReactNode;
  duration: number;
  reverse?: boolean;
  min?: number;
  className?: string;
}) {
  const list = fill(items, min);
  return (
    <div className={`tm-row ${className}`.trim()} style={{ "--duration": `${duration}s` } as CSSProperties} data-reverse={reverse || undefined}>
      <div className="tm-track">
        {[0, 1].map((g) => (
          <div key={g} className="tm-group" aria-hidden={g > 0 || undefined}>
            {list.map((r, i) => card(r, `${g}-${i}`))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Header/footer logo: the colour logo on light pages, the white one on dark pages. */
export const logoOf = (s: Site) => (s.theme.mode === "light" ? s.brand.logoOnLight || s.brand.logo : s.brand.logo);

export function SampleReviewsNote({ s, className = "tm-note" }: { s: Site; className?: string }) {
  return s.testimonials.sample ? <p className={className}>Örnek yorumlar · yayından önce gerçek öğrenci yorumlarıyla değiştirilir.</p> : null;
}

export function SamplePricesNote({ s, className = "tm-note" }: { s: Site; className?: string }) {
  return s.pricing.sample ? <p className={className}>Örnek fiyatlar · stüdyonun güncel fiyatlarıyla değiştirilir.</p> : null;
}
