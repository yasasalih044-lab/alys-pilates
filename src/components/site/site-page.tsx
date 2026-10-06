import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import {
  pricingServices,
  contactHref,
  isExternal,
  mapsHref,
  type SectionKey,
  type Site,
} from "@/lib/site";
import { SiteBehavior } from "@/components/site-behavior";
import { ScrollSteps } from "@/components/ui/scroll-steps";
import { TestimonialMarquee } from "@/components/ui/testimonial-marquee";
import { PricingInteraction } from "@/components/ui/pricing-interaction";
import { EdgeBlur } from "@/components/ui/edge-blur";
import { SilkBackground } from "@/components/ui/silk-background";
import "@/app/site.css";

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  );
}

function Ext({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const ext = isExternal(href);
  return (
    <a href={href} className={className} target={ext ? "_blank" : undefined} rel={ext ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((l, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {l}
    </span>
  ));
}

function Heading({ label, lines, intro }: { label: string; lines: string[]; intro?: string }) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-label">{label}</p>
        <h2>
          <Lines lines={lines} />
        </h2>
      </div>
      {intro ? <p>{intro}</p> : null}
    </div>
  );
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");

const pad2 = (i: number) => String(i + 1).padStart(2, "0");

const sections: Record<SectionKey, (s: Site) => ReactNode> = {
  hero: (s) => (
    <section className="hero-section photo-section">
      <div className="hero wrap">
        <div className="hero-copy">
          <p className="section-label">
            <span className="status-dot" aria-hidden />
            {s.hero.label}
          </p>
          <h1 className="shimmer" aria-label={s.hero.titleLines.join(" ")}>
            {s.hero.titleLines.map((l, i) => (
              <span key={i} className="shimmer-line" aria-hidden style={{ "--shimmer-delay": `${1.2 + i * 0.35}s` } as CSSProperties}>
                {l}
              </span>
            ))}
          </h1>
          <div className="hero-actions">
            <Ext href={contactHref(s)} className="button">
              {s.hero.primaryCta}
              <span>
                <ArrowUpRight />
              </span>
            </Ext>
            <Ext href={mapsHref(s)} className="button button-ghost">
              {s.hero.locationCta}
              <span>
                <MapPin />
              </span>
            </Ext>
          </div>
        </div>
        <figure className="hero-portrait">
          <div className="portrait-orbit" aria-hidden />
          <div className="hero-photo-blend">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-person" src={s.images.hero} width={1024} height={1536} fetchPriority="high" alt={s.images.heroAlt} />
          </div>
          <div className="hero-cities" aria-label={`${s.location.district}, ${s.location.city}`}>
            <span>{s.location.district}</span>
            <span className="city-connector" aria-hidden />
            <span>{s.location.city}</span>
          </div>
          <figcaption className="hero-signature">
            <span>{s.brand.name}</span>
            <span>{s.brand.role}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  ),

  strip: (s) => (
    <div className="brand-strip wrap">
      <span>{s.strip.lead}</span>
      <div>
        <span>{s.strip.from}</span>
        <span className="strip-line" aria-hidden />
        <span>{s.strip.to}</span>
        <span className="strip-star" aria-hidden>
          <Star />
        </span>
        <span>{s.strip.tail}</span>
      </div>
    </div>
  ),

  services: (s) => (
    <section className="section" id="dersler">
      <div className="wrap">
        <Heading label={s.services.label} lines={s.services.titleLines} intro={s.services.intro} />
        <div className="services-grid">
          {s.services.items.map((item, i) => (
            <Ext
              key={item.name}
              className="class-card"
              href={contactHref(s, `Merhaba, ${s.brand.name} "${item.name}" dersi hakkında bilgi almak istiyorum.`)}
            >
              <span className="class-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.alt} width={1024} height={1280} loading="lazy" />
                <span className="class-index">{pad2(i)}</span>
              </span>
              <span className="class-body">
                <span className="class-title">
                  <h3>{item.name}</h3>
                  <ArrowUpRight aria-hidden />
                </span>
                <p>{item.description}</p>
              </span>
            </Ext>
          ))}
        </div>
      </div>
    </section>
  ),

  about: (s) => (
    <section className="about-section section" id="studyo">
      <div className="wrap about-grid">
        <figure className="portrait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.images.detail} width={1024} height={1536} loading="lazy" alt={s.images.detailAlt} />
          <figcaption>
            <span>{s.brand.name}</span>
            <span>{s.brand.role}</span>
          </figcaption>
        </figure>
        <div className="about-copy">
          <p className="section-label">{s.about.label}</p>
          <h2>
            <Lines lines={s.about.titleLines} />
          </h2>
        </div>
      </div>
    </section>
  ),

  process: (s) => (
    <section className="process section wrap" id="surec">
      <div className="journey-solo">
        <ScrollSteps steps={s.process.items} />
        <Ext className="button journey-cta" href={contactHref(s)}>
          {s.process.items[0]?.title ?? s.booking.button}
          <span>
            <ArrowUpRight />
          </span>
        </Ext>
      </div>
    </section>
  ),

  perspective: (s) => (
    <section className="section perspective photo-section">
      <div className="wrap">
        <div className="perspective-grid">
          <figure className="studio-photo">
            <div className="studio-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.images.studio} width={1024} height={1536} loading="lazy" alt={s.images.studioAlt} />
            </div>
            <figcaption>
              <span>{s.perspective.caption}</span>
            </figcaption>
          </figure>
          <div className="principles">
            <span className="principles-kicker">{s.perspective.kicker}</span>
            <h3>
              {s.perspective.headline}
              <br />
              <em>{s.perspective.headlineEm}</em>
            </h3>
            <div>
              {s.perspective.items.map((p, i) => (
                <div key={p.title} className="principle">
                  <span>{pad2(i)}</span>
                  <div>
                    <h4>{p.title}</h4>
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Ext className="inline-link" href={contactHref(s)}>
              {s.perspective.link} <ArrowUpRight />
            </Ext>
          </div>
        </div>
      </div>
    </section>
  ),

  testimonials: (s) => (
    <section className="section testimonials" id="yorumlar">
      <div className="wrap">
        <Heading label={s.testimonials.label} lines={s.testimonials.titleLines} intro={s.testimonials.intro} />
      </div>
      <TestimonialMarquee reviews={s.testimonials.items} />
      {s.testimonials.sample ? (
        <p className="wrap tm-note">Örnek yorumlar · yayından önce gerçek öğrenci yorumlarıyla değiştirilir.</p>
      ) : null}
    </section>
  ),

  gallery: (s) =>
    s.gallery?.images.length ? (
      <section className="section gallery" id="studyo">
        <div className="wrap">
          <Heading label={s.gallery.label} lines={s.gallery.titleLines} />
        </div>
        <div className="gallery-strip">
          {s.gallery.images.map((src, i) => (
            <figure key={src} className="gallery-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${s.brand.name} salonundan ${i + 1}. fotoğraf`} width={600} height={750} loading="lazy" />
            </figure>
          ))}
        </div>
      </section>
    ) : null,

  trainers: (s) =>
    s.trainers?.items.length ? (
      <section className="section trainers" id="egitmenler">
        <div className="wrap">
          <Heading label={s.trainers.label} lines={s.trainers.titleLines} />
          <div className="trainer-grid">
            {s.trainers.items.map((t) => (
              <article key={t.name} className={`trainer${t.photo ? "" : " trainer-nophoto"}`}>
                {t.photo ? (
                  <div className="trainer-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.photo} alt={t.name} loading="lazy" />
                  </div>
                ) : (
                  <span className="trainer-mono" aria-hidden>
                    {initialsOf(t.name)}
                  </span>
                )}
                <div className="trainer-copy">
                  <h3>{t.name}</h3>
                  {t.title ? <p className="trainer-title">{t.title}</p> : null}
                  <p>{t.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ) : null,

  pricing: (s) => (
    <section className="section" id="paketler">
      <div className="wrap pricing-layout">
        <div>
          <p className="section-label">{s.pricing.label}</p>
          <h2>
            <Lines lines={s.pricing.titleLines} />
          </h2>
          {s.pricing.sample ? <p className="tm-note">Örnek fiyatlar · stüdyonun güncel fiyatlarıyla değiştirilir.</p> : null}
        </div>
        <PricingInteraction
          services={pricingServices(s)}
          cta={s.pricing.cta}
          contact={s.contact.whatsapp.replace(/\D/g, "")}
          brandName={s.brand.name}
        />
      </div>
    </section>
  ),

  faq: (s) => (
    <section className="faq section wrap" id="sss">
      <div>
        <p className="section-label">{s.faq.label}</p>
        <h2>{s.faq.title}</h2>
        <p className="faq-intro">{s.faq.intro}</p>
      </div>
      <div className="faq-list">
        {s.faq.items.map((f) => (
          <details key={f.q}>
            <summary>
              {f.q}
              <span aria-hidden>+</span>
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  ),

  booking: (s) => {
    const place = [s.location.address, s.location.district, s.location.city].filter(Boolean).join(", ");
    return (
      <section className="booking-section wrap" id="iletisim">
        <div className="booking-intro">
          <p className="section-label">{s.booking.label}</p>
          <h2>
            <Lines lines={s.booking.titleLines} />
          </h2>
          <p>{s.booking.body}</p>
          <div className="booking-person">
            <span className="booking-monogram" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.brand.mark} alt="" width={49} height={49} />
            </span>
            <div>
              <strong>{s.brand.name}</strong>
              <span>{s.brand.role}</span>
            </div>
          </div>
          <span className="booking-area">{place}</span>
          <Ext className="inline-link" href={mapsHref(s)}>
            Yol tarifi al <ArrowUpRight />
          </Ext>
        </div>
        <div className="booking-card">
          <div className="booking-card-top">
            <span>{s.booking.cardKicker}</span>
            <CalendarDays aria-hidden />
          </div>
          <h3>
            <Lines lines={s.booking.cardTitleLines} />
          </h3>
          <div className="booking-topics">
            {s.services.items.map((item) => (
              <span key={item.name}>{item.name}</span>
            ))}
          </div>
          <ol className="booking-steps">
            {s.booking.steps.map((step, i) => (
              <li key={step}>
                <span>{pad2(i)}</span>
                {step}
              </li>
            ))}
          </ol>
          <Ext className="button booking-action" href={contactHref(s)}>
            {s.booking.button}
            <span>
              <ArrowUpRight />
            </span>
          </Ext>
          <p className="booking-note">{s.booking.note}</p>
        </div>
      </section>
    );
  },
};

function Marquee({ s }: { s: Site }) {
  const group = (hidden: boolean) => (
    <div className="marquee-group" aria-hidden={hidden || undefined}>
      {s.marquee.map((w) => (
        <span key={w} style={{ display: "contents" }}>
          <span>{w}</span>
          <span className="marquee-star" aria-hidden>
            <Star />
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

/** Renders one studio site from its JSON. Theme colours are scoped to this wrapper. */
export default function SitePage({ s, children }: { s: Site; children?: ReactNode }) {
  const light = s.theme.mode === "light";
  return (
    <div className={`site-root${light ? " site-light" : ""}`}>
      <style>{`:root{${themeCss(s)}}`}</style>
      {light ? <SilkBackground bg={s.theme.bg} tint={s.theme.accent || s.theme.ink} /> : null}
      <div className="texture" aria-hidden style={{ "--texture": `url(${s.images.texture})` } as CSSProperties} />
      <a className="skip" href="#main">
        İçeriğe geç
      </a>
      <header className="masthead">
        <nav className="nav wrap" aria-label="Ana menü">
          <a className="brand" href="#main" aria-label={`${s.brand.name} · Ana sayfa`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.theme.mode === "light" ? s.brand.logoOnLight || s.brand.logo : s.brand.logo} alt={s.brand.name} data-mode={s.theme.mode ?? "dark"} />
          </a>
        </nav>
        <EdgeBlur position="top" height={36} className="edge-blur-under" />
      </header>

      <main id="main">
        {s.sections.map((key) => (
          <div key={key} style={{ display: "contents" }}>
            {sections[key]?.(s)}
          </div>
        ))}
      </main>

      <Marquee s={s} />


      <EdgeBlur position="bottom" height={64} />
      <SiteBehavior />
      {children}
    </div>
  );
}

/** Theme → CSS custom properties on :root, so body, header and every grey follow it. */
function themeCss(s: Site): string {
  const t = s.theme;
  const light = t.mode === "light";
  const cta = t.accent || (light ? t.ink : "#fafafa");
  const dark = light && luminance(t.ink) < 0.05 ? t.ink : "#111111";
  const vars: Record<string, string> = {
    "--bg": t.bg,
    "--surface": t.surface,
    "--ink": t.ink,
    "--muted": t.muted,
    "--line": t.line,
    "--accent": cta,
    "--cta": cta,
    // Whichever reads better on the button: white, or the page's dark ink (pastel buttons).
    "--cta-ink": 1.05 / (luminance(cta) + 0.05) >= (luminance(cta) + 0.05) / (luminance(dark) + 0.05) ? "#ffffff" : dark,
    "--scheme": light ? "light" : "dark",
    // Colour photos fade into the page itself; B&W ones into near-black (the ALYS look).
    // Light pages sit on the silk texture, so photos fade to transparent instead of a flat colour.
    "--photo-ground": light ? "transparent" : t.photos === "color" ? t.bg : "#030303",
    "--photo-filter": t.photos === "color" ? "none" : "grayscale(1) contrast(1.04)",
    "--photo-filter-hover": t.photos === "color" ? "saturate(1.08)" : "grayscale(0.85) contrast(1.06)",
    "--photo-blend": light || t.photos === "color" ? "normal" : "lighten",
    "--texture-blend": light ? "multiply" : "screen",
    "--texture-filter": light ? "invert(1)" : "none",
    "--texture-opacity": light ? "0.18" : "0.35",
  };
  return Object.entries(vars)
    .filter(([, v]) => /^[#\w\s().,%-]+$/.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Relative luminance (0–1) of a #rrggbb colour. */
function luminance(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
