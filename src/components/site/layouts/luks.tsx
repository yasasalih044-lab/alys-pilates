// LÜKS: boutique-hotel calm. Arched photos, hairlines, a slow rotating seal,
// centred serif headings, a price menu with dotted leaders and a colophon.
// Styles: src/app/style-luks.css (every rule scoped to [data-style="luks"]).
import { ArrowUpRight } from "lucide-react";
import { contactHref, pricingServices, type Site } from "@/lib/site";
import { PricingInteraction } from "@/components/ui/pricing-interaction";
import {
  Ext,
  HeroActions,
  HeroTitle,
  Lines,
  Marquee,
  ReviewTrack,
  SamplePricesNote,
  SampleReviewsNote,
  Star,
  initialsOf,
  logoOf,
  roman,
} from "@/components/site/parts";
import type { Layout } from "./types";

function Heading({ label, lines, intro }: { label: string; lines: string[]; intro?: string }) {
  return (
    <div className="lx-heading">
      <p className="lx-label">{label}</p>
      <h2>
        <Lines lines={lines} />
      </h2>
      {intro ? <p className="lx-intro">{intro}</p> : null}
    </div>
  );
}

/** Round seal on the arch: the hero label and the city, set on a circle and turning slowly. */
function Seal({ s }: { s: Site }) {
  const text = `${s.hero.label} · ${s.location.city} · `;
  return (
    <span className="lx-seal" aria-hidden>
      <svg viewBox="0 0 100 100">
        <defs>
          <path id="lx-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text>
          <textPath href="#lx-ring" textLength="236" lengthAdjust="spacingAndGlyphs">
            {text.toLocaleUpperCase("tr")}
          </textPath>
        </text>
      </svg>
      <span className="lx-seal__star">
        <Star />
      </span>
    </span>
  );
}

export const luks: Layout = {
  sections: {
    hero: (s) => (
      <section className="hero-section lx-hero">
        <div className="hero wrap lx-hero__inner">
          <div className="lx-hero__stage">
            <span className="lx-hero__side" aria-hidden>
              {s.location.district}
            </span>
            <figure className="lx-arch">
              <span className="lx-arch__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.images.hero} width={1024} height={1536} fetchPriority="high" alt={s.images.heroAlt} />
              </span>
              <Seal s={s} />
            </figure>
            <span className="lx-hero__side" aria-hidden>
              {s.location.city}
            </span>
          </div>
          <div className="hero-copy lx-hero__copy">
            <p className="lx-label">{s.hero.label}</p>
            <HeroTitle s={s} />
            <HeroActions s={s} secondaryClass="lx-link" />
          </div>
        </div>
      </section>
    ),

    process: (s) => (
      <section className="section lx-process" id="surec">
        <div className="wrap">
          <Heading label={s.process.label} lines={s.process.titleLines} intro={s.process.intro} />
          <ol className="lx-rituals">
            {s.process.items.map((item, i) => (
              <li key={item.title} className="lx-ritual">
                <span className="lx-ritual__num" aria-hidden>
                  {roman(i)}
                </span>
                <span className="lx-ritual__rule" aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
          {s.process.items[0] ? (
            <div className="lx-center">
              <Ext className="lx-link" href={contactHref(s)}>
                {s.process.items[0].title}
                <span>
                  <ArrowUpRight />
                </span>
              </Ext>
            </div>
          ) : null}
        </div>
      </section>
    ),

    gallery: (s) =>
      s.gallery?.images.length ? (
        <section className="section lx-gallery" id="studyo">
          <div className="wrap">
            <Heading label={s.gallery.label} lines={s.gallery.titleLines} />
            <div className="lx-triptych" data-count={Math.min(s.gallery.images.length, 3)}>
              {s.gallery.images.slice(0, 3).map((src, i) => (
                <div key={src} className="lx-triptych__cell">
                  <figure className="gallery-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${s.brand.name} salonundan ${i + 1}. fotoğraf`} width={600} height={750} loading="lazy" />
                  </figure>
                  <span className="lx-triptych__cap" aria-hidden>
                    {roman(i)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    testimonials: (s) => (
      <section className="section lx-reviews" id="yorumlar">
        <div className="wrap">
          <Heading label={s.testimonials.label} lines={s.testimonials.titleLines} intro={s.testimonials.intro} />
        </div>
        <div className="tm lx-guestbook">
          <ReviewTrack
            items={s.testimonials.items}
            duration={64}
            card={(r, key) => (
              <figure key={key} className="tm-card lx-card">
                <span className="lx-card__mark" aria-hidden>
                  “
                </span>
                <blockquote>{r.body}</blockquote>
                <span className="lx-card__rule" aria-hidden />
                <figcaption>
                  <strong>{r.name}</strong>
                  <span>{r.meta}</span>
                </figcaption>
              </figure>
            )}
          />
        </div>
        <SampleReviewsNote s={s} className="wrap tm-note lx-note" />
      </section>
    ),

    trainers: (s) =>
      s.trainers?.items.length ? (
        <section className="section lx-trainers" id="egitmenler">
          <div className="wrap">
            <Heading label={s.trainers.label} lines={s.trainers.titleLines} />
            <div className="lx-plates" data-count={s.trainers.items.length}>
              {s.trainers.items.map((t) => (
                <article key={t.name} className="lx-plate">
                  {t.photo ? (
                    <span className="lx-plate__photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.photo} alt={t.name} width={480} height={600} loading="lazy" />
                    </span>
                  ) : (
                    <span className="lx-plate__mono" aria-hidden>
                      {initialsOf(t.name)}
                    </span>
                  )}
                  <div className="lx-plate__copy">
                    <h3>{t.name}</h3>
                    {t.title ? <p className="lx-plate__title">{t.title}</p> : null}
                    <p className="lx-plate__bio">{t.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    pricing: (s) => (
      <section className="section lx-pricing" id="paketler">
        <div className="wrap">
          <Heading label={s.pricing.label} lines={s.pricing.titleLines} />
          <div className="lx-menu">
            <PricingInteraction
              services={pricingServices(s)}
              cta={s.pricing.cta}
              contact={s.contact.whatsapp.replace(/\D/g, "")}
              brandName={s.brand.name}
            />
            <SamplePricesNote s={s} className="tm-note lx-note" />
          </div>
        </div>
      </section>
    ),
  },

  closing: (s) => (
    <>
      <Marquee s={s} />
      <footer className="lx-colophon">
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoOf(s)} alt={s.brand.name} width={168} height={56} loading="lazy" />
          <p className="lx-colophon__name">{s.brand.name}</p>
          <p className="lx-colophon__meta">
            {s.brand.role} · {s.location.district}, {s.location.city}
          </p>
          {s.location.address ? <p className="lx-colophon__meta">{s.location.address}</p> : null}
          <span className="lx-colophon__rule" aria-hidden />
        </div>
      </footer>
    </>
  ),
};
