import type { Metadata } from "next";
import Script from "next/script";
import { KIT_SRC } from "@/lib/fm-kit";
import { Builder } from "@/components/builder/builder";
import "./builder.css";

export const metadata: Metadata = {
  title: "Site Yapıcı | Reformer Dijital",
  description: "Siteni yap, tek tıkla yayınla. Reformer pilates stüdyoları için, ilk 1 ay ücretsiz.",
  icons: { icon: "/rd-logo.webp" },
};

export default function Page() {
  return (
    <>
      {/* Fullmatik members only: the kit shows the sign-in before the builder can be used (our API checks again). */}
      <Script src={KIT_SRC} strategy="afterInteractive" data-site="siteyapici" data-auth="required" />
      <Builder />
    </>
  );
}
