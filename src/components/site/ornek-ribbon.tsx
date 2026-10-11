import { SITE_STYLES, type SiteStyle } from "@/lib/styles";

/**
 * Strip above the example site (/ornek/<stil>): says it is an example and
 * switches style and light/dark. Reformer Dijital colours, like the preview bar.
 * Sits outside the header, so the header stays "logo only".
 */
export function OrnekRibbon({ stil, acik }: { stil: SiteStyle; acik: boolean }) {
  const q = acik ? "?tema=acik" : "";
  return (
    <div className="ornek-ribbon" role="region" aria-label="Örnek site">
      <p className="ornek-ribbon__text">
        <strong>Örnek site</strong> · Kendi siten formdaki bilgilerinle (logo, fotoğraflar, fiyatlar) oluşturulur.
      </p>
      <nav className="ornek-ribbon__row" aria-label="Tarz ve tema">
        <span className="ornek-ribbon__group">
          {SITE_STYLES.map((o) => (
            <a key={o.key} href={`/ornek/${o.key}${q}`} aria-current={o.key === stil ? "page" : undefined}>
              {o.name}
            </a>
          ))}
        </span>
        <span className="ornek-ribbon__group">
          <a href={`/ornek/${stil}?tema=acik`} aria-current={acik ? "true" : undefined}>
            Açık
          </a>
          <a href={`/ornek/${stil}`} aria-current={acik ? undefined : "true"}>
            Koyu
          </a>
        </span>
      </nav>
    </div>
  );
}
