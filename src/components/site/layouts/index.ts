import type { SiteStyle } from "@/lib/styles";
import type { Layout } from "./types";
import { luks } from "./luks";
import { modern } from "./modern";
import { sade } from "./sade";

/** Editoryal has no entry: it keeps the original renderers in site-page.tsx, untouched. */
export const LAYOUTS: Partial<Record<SiteStyle, Layout>> = { luks, modern, sade };
