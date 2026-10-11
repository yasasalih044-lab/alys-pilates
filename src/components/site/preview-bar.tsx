import type { ReactNode } from "react";

const RD_WHATSAPP = "905454498280";

/**
 * Sticky Reformer Dijital bar on Site Yapıcı previews: one tap → our WhatsApp.
 * The example pages (/ornek) pass their own label, button text and message.
 */
export function PreviewBar({
  url,
  studio,
  label,
  cta = "Bu siteyi istiyorum",
  message,
}: {
  url: string;
  studio: string;
  label?: ReactNode;
  cta?: string;
  message?: string;
}) {
  const href = `https://wa.me/${RD_WHATSAPP}?text=${encodeURIComponent(message ?? `Merhaba, internet sitemi istiyorum: ${url}`)}`;
  return (
    <aside className="pv-bar" aria-label="Site Yapıcı önizlemesi">
      <p>
        {label ?? (
          <>
            <strong>{studio}</strong> için önizleme · <span>İlk 1 ay ücretsiz</span>
          </>
        )}
      </p>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {cta}
      </a>
    </aside>
  );
}
