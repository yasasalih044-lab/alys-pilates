import { Bricolage_Grotesque, Cormorant_Garamond, Outfit } from "next/font/google";

/*
 * Display fonts of the style presets. Not preloaded: a browser only downloads
 * the one the page actually uses (fonts load on first use), so a "Sade" site
 * never fetches the "Lüks" serif.
 */
const lux = Cormorant_Garamond({ variable: "--font-lux", subsets: ["latin", "latin-ext"], weight: ["500", "600"], style: ["normal", "italic"], preload: false });
const bold = Bricolage_Grotesque({ variable: "--font-bold", subsets: ["latin", "latin-ext"], weight: ["700", "800"], preload: false });
const soft = Outfit({ variable: "--font-soft", subsets: ["latin", "latin-ext"], weight: ["300", "400", "500"], preload: false });

export const styleFontVars = `${lux.variable} ${bold.variable} ${soft.variable}`;
