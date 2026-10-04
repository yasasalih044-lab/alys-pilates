const RD_WHATSAPP = "905454498280";

/** Sticky Reformer Dijital bar on Site Yapıcı previews: one tap → our WhatsApp. */
export function PreviewBar({ url, studio }: { url: string; studio: string }) {
  const href = `https://wa.me/${RD_WHATSAPP}?text=${encodeURIComponent(`Merhaba, internet sitemi istiyorum: ${url}`)}`;
  return (
    <aside className="pv-bar" aria-label="Site Yapıcı önizlemesi">
      <p>
        <strong>{studio}</strong> için önizleme · <span>İlk 1 ay ücretsiz</span>
      </p>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Bu siteyi istiyorum
      </a>
    </aside>
  );
}
