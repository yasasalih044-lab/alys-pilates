import type { Metadata } from "next";
import { Builder } from "@/components/builder/builder";
import "./builder.css";

export const metadata: Metadata = {
  title: "Site Yapıcı | Reformer Dijital",
  description: "Siteni yap, tek tıkla yayınla. Reformer pilates stüdyoları için, ilk 1 ay ücretsiz.",
  icons: { icon: "/rd-logo.webp" },
};

export default function Page() {
  return <Builder />;
}
