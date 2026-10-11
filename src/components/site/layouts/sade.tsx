// SADE: quiet and minimal. One soft family, a full-bleed cover photo with a
// floating sheet, a soft accordion, a staggered photo column, slowly rising
// review columns, round portraits and one soft pricing card.
// Styles: src/app/style-sade.css (every rule scoped to [data-style="sade"]).
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
  initialsOf,
  logoOf,
} from "@/components/site/parts";
import type { Layout } from "./types";

function Heading({ label, lines, intro }: { label: string; lines: string[]; intro?: string }) {
  return (
    <div className="sd-heading">
      <p className="sd-label">{label}</p>
      <h2>
        <Lines lines={lines} />
      </h2>
      {intro ? <p className="sd-intro">{intro}</p> : null}
    </div>
  );
}

/** Three columns for desktop, each starting at a different review; phones show only the first (all reviews). */
function columns<T>(items: T[]): T[][] {
  const step = Math.max(1, Math.ceil(items.length / 3));
  return [0, 1, 2].map((c) => [...items.slice((c * step) % items.length), ...items.slice(0, (c * step) % items.length)]);
}

const ReviewCard = (r: { name: string; meta: string; body: string }, key: string) => (
  <figure key={key} className="tm-card sd-review">
    <blockquote>{r.body}</blockquote>
    <figcaption>
      <span className="sd-av" aria-hidden>
        {initialsOf(r.name)}
      </span>
      <span>
        <strong>{r.name}</strong>
        <span>{r.meta}</span>
      </span>
    </figcaption>
  </figure>
);

export const sade: Layout = {
  sections: {
    hero: (s) => (
      <section className="hero-section sd-hero">
        <figure className="sd-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.images.hero} width={1024} height={1536} fetchPriority="high" alt={s.images.heroAlt} />
        </figure>
        <div className="hero sd-hero__inner">
          <div className="hero-copy sd-sheet">
            <p className="sd-label">{s.hero.label}</p>
            <HeroTitle s={s} />
            <HeroActions s={s} />
          </div>
        </div>
      </section>
    ),

    process: (s) => (
      <section className="section sd-process" id="surec">
        <div className="wrap">
          <Heading label={s.process.label} lines={s.process.titleLines} intro={s.process.intro} />
          <div className="sd-acc">
            {s.process.items.map((item, i) => (
              <details key={item.title} className="sd-acc__item" name="sd-surec" open={i === 0}>
                <summary>
                  <span className="sd-acc__num" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="sd-acc__title">{item.title}</span>
                  <span className="sd-acc__plus" aria-hidden />
                </summary>
                <p className="sd-acc__body">{item.body}</p>
              </details>
            ))}
          </div>
          {s.process.items[0] ? (
            <div className="sd-center">
              <Ext className="button sd-cta" href={contactHref(s)}>
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
        <section className="section sd-gallery" id="studyo">
          <div className="wrap">
            <Heading label={s.gallery.label} lines={s.gallery.titleLines} />
            <div className="sd-stagger" data-count={Math.min(s.gallery.images.length, 3)}>
              {s.gallery.images.slice(0, 3).map((src, i) => (
                <figure key={src} className="gallery-item sd-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${s.brand.name} salonundan ${i + 1}. fotoğraf`} width={600} height={750} loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    testimonials: (s) => (
      <section className="section sd-reviews" id="yorumlar">
        <div className="wrap">
          <Heading label={s.testimonials.label} lines={s.testimonials.titleLines} intro={s.testimonials.intro} />
          <div className="sd-cols">
            {columns(s.testimonials.items).map((col, c) => (
              <ReviewTrack key={c} className="sd-col" items={col} duration={c === 1 ? 60 : 48} reverse={c === 1} card={ReviewCard} />
            ))}
          </div>
          <SampleReviewsNote s={s} className="tm-note sd-note" />
        </div>
      </section>
    ),

    trainers: (s) =>
      s.trainers?.items.length ? (
        <section className="section sd-trainers" id="egitmenler">
          <div className="wrap">
            <Heading label={s.trainers.label} lines={s.trainers.titleLines} />
            <div className="sd-people" data-count={s.trainers.items.length}>
              {s.trainers.items.map((t) => (
                <article key={t.name} className="sd-person">
                  {t.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="sd-person__photo" src={t.photo} alt={t.name} width={296} height={296} loading="lazy" />
                  ) : (
                    <span className="sd-person__mono" aria-hidden>
                      {initialsOf(t.name)}
                    </span>
                  )}
                  <h3>{t.name}</h3>
                  {t.title ? <p className="sd-person__title">{t.title}</p> : null}
                  <p className="sd-person__bio">{t.bio}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    pricing: (s) => (
      <section className="section sd-pricing" id="paketler">
        <div className="wrap">
          <Heading label={s.pricing.label} lines={s.pricing.titleLines} />
          <div className="sd-price-card">
            <PricingInteraction
              services={pricingServices(s)}
              cta={s.pricing.cta}
              contact={s.contact.whatsapp.replace(/\D/g, "")}
              brandName={s.brand.name}
            />
            <SamplePricesNote s={s} className="tm-note sd-note" />
          </div>
        </div>
      </section>
    ),
  },

  closing: (s: Site) => (
    <>
      <Marquee s={s} sep={<span className="sd-dot" />} />
      <footer className="sd-footer">
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoOf(s)} alt={s.brand.name} width={132} height={44} loading="lazy" />
          <p>
            {s.brand.name} · {s.location.district}, {s.location.city}
          </p>
        </div>
      </footer>
    </>
  ),
};
