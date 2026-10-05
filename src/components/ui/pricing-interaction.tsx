"use client";

// Port of 21st.dev "Pricing Interaction" (ln-dev7): service toggle with a
// sliding thumb, radio-style package rows with a sliding selection frame and
// animated prices (NumberFlow). Packages are session based and each service
// can have its own number of packages, so the frame follows the measured row.
import NumberFlow from "@number-flow/react";
import { useLayoutEffect, useRef, useState } from "react";
import type { PricedService } from "@/lib/site";

export function PricingInteraction({
  services,
  cta,
  contact,
  brandName,
}: {
  services: PricedService[];
  cta: string;
  /** WhatsApp number digits; empty = link to the page's contact. */
  contact: string;
  brandName: string;
}) {
  const [svc, setSvc] = useState(0);
  const service = services[svc];
  const defaultPick = (i: number) => Math.max(0, services[i].packages.findIndex((p) => p.popular));
  const [active, setActive] = useState(defaultPick(0));
  const pkg = service.packages[Math.min(active, service.packages.length - 1)];
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const [frame, setFrame] = useState({ y: 0, h: 0 });

  useLayoutEffect(() => {
    const el = rows.current[active];
    if (el) setFrame({ y: el.offsetTop, h: el.offsetHeight });
  }, [active, svc]);

  const message = `Merhaba, ${brandName} "${service.name} · ${pkg?.name ?? ""}" paketi hakkında bilgi almak istiyorum.`;
  const href = contact ? `https://wa.me/${contact}?text=${encodeURIComponent(message)}` : "#iletisim";

  return (
    <div className="pi" style={{ "--pi-count": services.length } as React.CSSProperties}>
      {services.length > 1 ? (
        <div className={`pi-toggle${services.length > 3 ? " pi-toggle-wrap" : ""}`} role="tablist" aria-label="Hizmet">
          {services.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={svc === i}
              className="pi-toggle-btn"
              onClick={() => {
                setSvc(i);
                setActive(defaultPick(i));
              }}
            >
              {s.name}
            </button>
          ))}
          {services.length <= 3 ? <span className="pi-thumb" aria-hidden style={{ transform: `translateX(${svc * 100}%)` }} /> : null}
        </div>
      ) : (
        <p className="pi-single">{service.name}</p>
      )}

      <div className="pi-plans" role="radiogroup" aria-label="Paket">
        {service.packages.map((p, i) => (
          <button
            key={`${service.name}-${p.name}`}
            ref={(el) => {
              rows.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active === i}
            className="pi-plan"
            onClick={() => setActive(i)}
          >
            <span className="pi-plan-copy">
              <span className="pi-plan-name">
                {p.name}
                {p.popular ? <span className="pi-badge">Popüler</span> : null}
              </span>
              <span className="pi-plan-price">
                {p.price != null ? (
                  <strong>
                    <NumberFlow value={p.price} locales="tr-TR" format={{ maximumFractionDigits: 0 }} /> ₺
                  </strong>
                ) : (
                  <strong>Fiyat için yazın</strong>
                )}
              </span>
            </span>
            <span className="pi-radio" aria-hidden />
          </button>
        ))}
        <span className="pi-frame" aria-hidden style={{ transform: `translateY(${frame.y}px)`, height: frame.h || undefined }} />
      </div>

      <a className="pi-cta" href={href} target={contact ? "_blank" : undefined} rel={contact ? "noopener noreferrer" : undefined}>
        {cta}
      </a>
    </div>
  );
}
