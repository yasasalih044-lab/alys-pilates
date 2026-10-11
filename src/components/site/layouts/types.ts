import type { ReactNode } from "react";
import type { SectionKey, Site } from "@/lib/site";

/** A style's own page design: section renderers (missing ones fall back to Editoryal) + the page closing. */
export type Layout = {
  sections: Partial<Record<SectionKey, (s: Site) => ReactNode>>;
  closing: (s: Site) => ReactNode;
};
