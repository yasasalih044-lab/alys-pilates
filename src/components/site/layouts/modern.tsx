// MODERN: confident and graphic. Heavy grotesk, brand-colour blocks, thick
// outlines with hard offset shadows, bento grids, sticky stacking step cards,
// a tilted review tape and a giant district name in the footer.
// Styles: src/app/style-modern.css (every rule scoped to [data-style="modern"]).
import type { CSSProperties } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { contactHref, pricingServices } from "@/lib/site";
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
  pad2,
} from "@/components/site/parts";
import type { Layout } from "./types";

const fit = (text: string) => ({ "--n": Math.max(4, [...text].length) }) as CSSProperties;

function Heading({ label, lines, intro }: { label: string; lines: string[]; intro?: string }) {
  return (
    <div className="md-heading">
      <p className="md-chip">{label}</p>
      <h2>
        <Lines lines={lines} />
      </h2>
      {intro ? <p className="md-intro">{intro}</p> : null}
    </div>
  );
}

export const modern: Layout = {
  sections: {
    hero: (s) => (
      <section className="hero-section md-hero">
        <div className="hero wrap md-hero__grid">
          <div className="hero-copy md-hero__copy">
            <p className="md-chip">{s.hero.label}</p>
            <HeroTitle s={s} />
            <HeroActions s={s} />
          </div>
          <figure className="md-tile md-tile--photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.images.hero} width={1024} height={1536} fetchPriority="high" alt={s.images.heroAlt} />
          </figure>
          <div className="md-tile md-tile--cta">
            <span className="md-tile__star" aria-hidden>
              <Star />
            </span>
            <span className="md-tile__small">{s.brand.role}</span>
            <strong className="md-tile__district" style={fit(s.location.district)}>
              {s.location.district}
            </strong>
          </div>
          <div className="md-tile md-tile--outline">
            <MapPin aria-hidden />
            <span>{s.location.city}</span>
          </div>
        </div>
      </section>
    ),

    process: (s) => (
      <section className="section md-process" id="surec">
        <div className="wrap md-process__grid">
          <div className="md-process__head">
            <Heading label={s.process.label} lines={s.process.titleLines} intro={s.process.intro} />
          </div>
          <div className="md-process__list">
            <ol className="md-steps">
              {s.process.items.map((item, i) => (
                <li key={item.title} className="md-step" style={{ "--i": i } as CSSProperties}>
                  <span className="md-step__num" aria-hidden>
                    {pad2(i)}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
            {s.process.items[0] ? (
              <Ext className="button md-process__cta" href={contactHref(s)}>
                {s.process.items[0].title}
                <span>
                  <ArrowUpRight />
                </span>
              </Ext>
            ) : null}
          </div>
        </div>
      </section>
    ),

    gallery: (s) =>
      s.gallery?.images.length ? (
        <section className="section md-gallery" id="studyo">
          <div className="wrap">
            <div className="md-mosaic" data-count={Math.min(s.gallery.images.length, 3)}>
              <div className="md-mosaic__head">
                <p className="md-mosaic__label">{s.gallery.label}</p>
                <h2>
                  <Lines lines={s.gallery.titleLines} />
                </h2>
              </div>
              {s.gallery.images.slice(0, 3).map((src, i) => (
                <figure key={src} className="gallery-item md-mosaic__item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${s.brand.name} salonundan ${i + 1}. fotoğraf`} width={600} height={750} loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    testimonials: (s) => (
      <section className="section md-reviews" id="yorumlar">
        <div className="wrap">
          <Heading label={s.testimonials.label} lines={s.testimonials.titleLines} intro={s.testimonials.intro} />
        </div>
        <div className="md-tape">
          <ReviewTrack
            items={s.testimonials.items}
            duration={44}
            card={(r, key) => (
              <figure key={key} className="tm-card md-review">
                <blockquote>“{r.body}”</blockquote>
                <figcaption>
                  <span className="md-review__av" aria-hidden>
                    {initialsOf(r.name)}
                  </span>
                  <span>
                    <strong>{r.name}</strong>
                    <span>{r.meta}</span>
                  </span>
                </figcaption>
              </figure>
            )}
          />
        </div>
        <SampleReviewsNote s={s} className="wrap tm-note md-note" />
      </section>
    ),

    trainers: (s) =>
      s.trainers?.items.length ? (
        <section className="section md-trainers" id="egitmenler">
          <div className="wrap">
            <Heading label={s.trainers.label} lines={s.trainers.titleLines} />
            <div className="md-ids" data-count={s.trainers.items.length}>
              {s.trainers.items.map((t) => (
                <article key={t.name} className="md-id">
                  {t.photo ? (
                    <span className="md-id__photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.photo} alt={t.name} width={600} height={600} loading="lazy" />
                    </span>
                  ) : (
                    <span className="md-id__mono" aria-hidden>
                      {initialsOf(t.name)}
                    </span>
                  )}
                  <div className="md-id__copy">
                    <h3>{t.name}</h3>
                    {t.title ? <p className="md-chip md-chip--sm">{t.title}</p> : null}
                    <p className="md-id__bio">{t.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null,

    pricing: (s) => (
      <section className="section md-pricing" id="paketler">
        <div className="wrap md-pricing__grid">
          <div className="md-pricing__tile">
            <p className="md-pricing__label">{s.pricing.label}</p>
            <h2>
              <Lines lines={s.pricing.titleLines} />
            </h2>
            <SamplePricesNote s={s} className="md-pricing__note" />
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
  },

  closing: (s) => (
    <>
      <Marquee s={s} />
      <footer className="md-footer">
        <div className="wrap">
          <p className="md-footer__district" style={fit(s.location.district)}>
            {s.location.district}
          </p>
          <div className="md-footer__row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoOf(s)} alt={s.brand.name} width={132} height={44} loading="lazy" />
            <span>
              {s.brand.name} · {s.location.city}
            </span>
          </div>
        </div>
      </footer>
    </>
  ),
};
