# Editorial Dark — pilates studio template (final export: ALYS Pilates, 2026-10-04)

Design language taken from yigitakalin.com: graphite background, Manrope + italic
Cormorant, black-and-white editorial photos with feathered edges, liquid CTA.
Only **colours** and **photos** change between studios; everything else is text.

`alys-pilates.final.json` is the exact content of the approved ALYS site.
`alys-images/` holds its images (logo is the gpt-image-2 white version).

## Variables

| Path | What | Source in Site Yapıcı |
|---|---|---|
| `brand.name`, `brand.role`, `brand.tagline`, `brand.monogram` | studio identity | form + AI |
| `brand.logo` | white logo on transparency (dark site) | upload → `gpt-image-2` white mode |
| `brand.logoOnLight` | original colour logo | upload → `gpt-image-2` exact mode |
| `theme.accent` | accent colour; empty = white buttons | form (colour pick) |
| `theme.bg/surface/ink/muted/line` | fixed dark palette | template |
| `images.hero/studio/detail/texture` + alts | photos | upload or default library |
| `services.items[].image` | class photos | default library |
| `location.district/city/address/mapQuery` | "Yerimiz nerede?" + booking | form |
| `contact.whatsapp/instagram/phone` | every CTA (WhatsApp → Instagram → #iletisim) | form |
| `hero.*`, `services.*`, `about.*`, `perspective.*`, `faq.*`, `booking.*`, `marquee` | copy | AI (gpt-5-mini, strict JSON) |
| `process.items` | the 5 fixed steps | template |
| `pricing.periods/plans[].prices` | prices; `null` = "Fiyat için yazın" | form |
| `pricing.sample`, `testimonials.sample` | true = placeholder data with a visible note | template |
| `testimonials` | only real reviews; section hidden otherwise | form (later) |
| `sections` | section order / which are shown | template + data |
