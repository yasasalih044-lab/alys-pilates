/**
 * "Sitenin zemini" choices, shown in the form's colour step and in the
 * preview's "Düzenle" panel. Besides these, any colour from the colour picker
 * (#rrggbb). The theme for each is computed in lib/palette.ts.
 */
export const GROUND_OPTIONS = [
  { value: "beyaz", label: "Beyaz", sw: "#ffffff" },
  { value: "krem", label: "Krem", sw: "#f7f2ea" },
  { value: "siyah", label: "Siyah", sw: "#0b0b0c" },
] as const;

export const isHexColour = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Starting colour of the picker before the owner picked one (a soft sand). */
export const PICKER_START = "#e9dfd1";
