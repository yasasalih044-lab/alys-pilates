/**
 * Site styles ("Tarz") the owner picks in the form. Only the look changes:
 * content, colours from the logo, images and sections stay the same.
 * Rendered as `data-style` on the site root; Lüks / Modern / Sade have their own
 * page designs (components/site/layouts) and CSS (app/style-<key>.css).
 */
export const SITE_STYLES = [
  { key: "editoryal", name: "Editoryal", note: "Dergi gibi: büyük başlıklar, yumuşak geçişler." },
  { key: "luks", name: "Lüks", note: "Kemerli pencere, ince serif, simetrik ve sakin." },
  { key: "modern", name: "Modern", note: "Kalın yazılar, marka renginde bloklar, bento düzen." },
  { key: "sade", name: "Sade", note: "Tam ekran fotoğraf, yumuşak kartlar, az süs." },
] as const;

export type SiteStyle = (typeof SITE_STYLES)[number]["key"];

export const DEFAULT_STYLE: SiteStyle = "editoryal";

export const isSiteStyle = (v: unknown): v is SiteStyle => SITE_STYLES.some((s) => s.key === v);
