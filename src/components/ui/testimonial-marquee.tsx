// Port of 21st.dev "marquee-01" (two opposite rows of review cards, pause on
// hover, faded edges) to this template's plain-CSS system. The Marquee helper
// repeats children so the CSS loop (-50% translate) is seamless.
import type { CSSProperties, ReactNode } from "react";

type Review = { name: string; meta: string; body: string };

function Marquee({
  children,
  reverse = false,
  duration = 40,
  repeat = 2,
}: {
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  repeat?: number;
}) {
  return (
    <div className="tm-row" style={{ "--duration": `${duration}s` } as CSSProperties} data-reverse={reverse || undefined}>
      <div className="tm-track">
        {Array.from({ length: repeat }, (_, i) => (
          <div key={i} className="tm-group" aria-hidden={i > 0 || undefined}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
}

function ReviewCard({ name, meta, body }: Review) {
  return (
    <figure className="tm-card">
      <blockquote>“{body}”</blockquote>
      <figcaption>
        <span className="tm-avatar" aria-hidden>
          {initials(name)}
        </span>
        <span>
          <strong>{name}</strong>
          <span>{meta}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialMarquee({ reviews }: { reviews: Review[] }) {
  const half = Math.ceil(reviews.length / 2);
  const rows = [reviews.slice(0, half), reviews.slice(half)];
  return (
    <div className="tm">
      {rows.map((row, r) => (
        <Marquee key={r} reverse={r === 1} duration={48}>
          {row.map((review) => (
            <ReviewCard key={review.name + review.body.slice(0, 12)} {...review} />
          ))}
        </Marquee>
      ))}
    </div>
  );
}
