/**
 * Approved hero headlines (two lines each). One is picked per studio from its
 * name, so different studios get different heroes and a regenerate keeps the
 * same one. "{ilce}" becomes the studio's district.
 */
export const HERO_LINES: [string, string][] = [
  ["Aradığın salonu", "sonunda buldun."],
  ["Postürünü", "bizimle düzelt."],
  ["Bizimle birlikte", "güçlen."],
  ["Yanı başında", "yeni bir aile."],
  ["{ilce},", "seni bekliyoruz."],
  ["Bedenin sana", "teşekkür edecek."],
  ["İlk adımı", "bugün at."],
  ["Dik duruş,", "güçlü bir merkez."],
  ["Haftanın en iyi", "saati burada."],
  ["Güçlü hisset,", "iyi görün."],
];

export function heroLines(studio: string, district: string): string[] {
  const n = [...studio.toLocaleLowerCase("tr")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return HERO_LINES[n % HERO_LINES.length].map((l) => l.replace("{ilce}", district));
}
