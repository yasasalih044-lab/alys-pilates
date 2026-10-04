"use client";

// Port of 21st.dev "Pricing Interaction" (ln-dev7): period toggle with a
// sliding thumb, radio-style plan rows with a sliding selection frame, animated
// prices (NumberFlow) and one action button. Generalised to N plans / N periods
// from site.json and restyled for the dark template.
import NumberFlow from "@number-flow/react";
import { useState } from "react";

type Plan = { name: string; note: string; prices: (number | null)[]; popular: boolean };

export function PricingInteraction({
  periods,
  plans,
  unit,
  cta,
  contact,
  brandName,
}: {
  periods: string[];
  plans: Plan[];
  unit: string;
  cta: string;
  /** WhatsApp number digits; empty = link to the booking section. */
  contact: string;
  brandName: string;
}) {
  const [period, setPeriod] = useState(0);
  const [active, setActive] = useState(Math.max(0, plans.findIndex((p) => p.popular)));
  const plan = plans[active];

  const message = `Merhaba, ${brandName} "${periods[period]} · ${plan.name}" paketi hakkında bilgi almak istiyorum.`;
  const href = contact ? `https://wa.me/${contact}?text=${encodeURIComponent(message)}` : "#iletisim";

  return (
    <div className="pi" style={{ "--pi-count": periods.length } as React.CSSProperties}>
      <div className="pi-toggle" role="tablist" aria-label="Ders tipi">
        {periods.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={period === i}
            className="pi-toggle-btn"
            onClick={() => setPeriod(i)}
          >
            {label}
          </button>
        ))}
        <span className="pi-thumb" aria-hidden style={{ transform: `translateX(${period * 100}%)` }} />
      </div>

      <div className="pi-plans" role="radiogroup" aria-label="Paket">
        {plans.map((p, i) => {
          const price = p.prices[period] ?? null;
          return (
            <button
              key={p.name}
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
                  {price != null ? (
                    <>
                      <strong>
                        <NumberFlow value={price} locales="tr-TR" format={{ maximumFractionDigits: 0 }} /> ₺
                      </strong>
                      <span>{unit}</span>
                    </>
                  ) : (
                    <strong>Fiyat için yazın</strong>
                  )}
                  <span className="pi-plan-note">· {p.note}</span>
                </span>
              </span>
              <span className="pi-radio" aria-hidden />
            </button>
          );
        })}
        <span className="pi-frame" aria-hidden style={{ transform: `translateY(calc(${active} * (var(--pi-row) + var(--pi-gap))))` }} />
      </div>

      <a
        className="pi-cta"
        href={href}
        target={contact ? "_blank" : undefined}
        rel={contact ? "noopener noreferrer" : undefined}
      >
        {cta}
      </a>
    </div>
  );
}
