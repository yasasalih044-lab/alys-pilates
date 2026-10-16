import type { ReactNode } from "react";
import { PreviewEditor } from "@/components/site/preview-editor";
import type { SiteStyle } from "@/lib/styles";

const RD_WHATSAPP = "905454498280";

/**
 * Sticky Reformer Dijital bar on Site Yapıcı previews: one tap → our WhatsApp.
 * The example pages (/ornek) pass their own label, button text and message.
 * Studio previews also get "Düzenle" (page ground and style, see PreviewEditor).
 */
export function PreviewBar({
  url,
  studio,
  label,
  cta = "Bu siteyi istiyorum",
  message,
  edit,
}: {
  url: string;
  studio: string;
  label?: ReactNode;
  cta?: string;
  message?: string;
  edit?: { slug: string; style: SiteStyle; ground: string };
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
      {edit ? <PreviewEditor {...edit} /> : null}
      <a href={href} target="_blank" rel="noopener noreferrer">
        {cta}
      </a>
    </aside>
  );
}
