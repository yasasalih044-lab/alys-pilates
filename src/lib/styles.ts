/**
 * Site styles ("Tarz") the owner picks in the form. Only the look changes:
 * content, colours from the logo, images and sections stay the same.
 * Rendered as `data-style` on the site root; CSS lives in app/site-styles.css.
 */
export const SITE_STYLES = [
  { key: "editoryal", name: "Editoryal", note: "Dergi gibi: büyük başlıklar, yumuşak geçişler." },
  { key: "luks", name: "Lüks", note: "İnce serif yazılar, kemerli fotoğraflar, bol boşluk." },
  { key: "modern", name: "Modern", note: "Kalın yazılar, marka renginde net bloklar." },
  { key: "sade", name: "Sade", note: "Ortalanmış, ferah ve az süslü." },
] as const;

export type SiteStyle = (typeof SITE_STYLES)[number]["key"];

export const DEFAULT_STYLE: SiteStyle = "editoryal";

export const isSiteStyle = (v: unknown): v is SiteStyle => SITE_STYLES.some((s) => s.key === v);
