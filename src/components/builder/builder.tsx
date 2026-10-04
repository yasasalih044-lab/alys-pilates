"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const RD_WHATSAPP = "905454498280";

type ClassKey = "group" | "private" | "duet";
const CLASS_OPTIONS: { key: ClassKey; label: string; hint: string }[] = [
  { key: "group", label: "Reformer grup", hint: "Küçük gruplarla dersler" },
  { key: "private", label: "Özel ders", hint: "Birebir seanslar" },
  { key: "duet", label: "Düet", hint: "İki kişilik dersler" },
];
const SWATCHES = [
  { label: "Pembe", value: "#ff2bd6" },
  { label: "Mor", value: "#a855f7" },
  { label: "Altın", value: "#d4af37" },
  { label: "Yeşil", value: "#22c55e" },
  { label: "Mavi", value: "#3b82f6" },
  { label: "Beyaz", value: "" },
];
const PHOTO_SLOTS = [
  { key: "photo_hero", label: "Ana görsel", hint: "Sitenin girişinde, dikey" },
  { key: "photo_studio", label: "Stüdyo", hint: "Reformerlarınız, salon" },
  { key: "photo_detail", label: "Detay", hint: "Hareket, el, alet" },
] as const;
const PLAN_LABELS = ["Ayda 4 ders", "Ayda 8 ders", "Ayda 12 ders"];

type Prices = Record<"group" | "private", string[]>;

const STEPS = ["intro", "studio", "location", "contact", "classes", "prices", "color", "photos", "build", "done"] as const;
type Step = (typeof STEPS)[number];

/** Rough wall-clock stages while the server works (logo redraw is the slow part). */
const BUILD_STAGES = [
  { at: 0, text: "Bilgilerin alınıyor" },
  { at: 4, text: "Site metinlerin yazılıyor" },
  { at: 12, text: "Logon yüksek çözünürlükte yeniden çiziliyor" },
  { at: 40, text: "Renklerin ve fotoğrafların yerleştiriliyor" },
  { at: 65, text: "Son dokunuşlar yapılıyor" },
];

export function Builder() {
  const [step, setStep] = useState<Step>("intro");
  const [studio, setStudio] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [classes, setClasses] = useState<ClassKey[]>(["group", "private"]);
  const [prices, setPrices] = useState<Prices>({ group: ["", "", ""], private: ["", "", ""] });
  const [accent, setAccent] = useState("#ff2bd6");
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const honeypot = useRef<HTMLInputElement>(null);

  const index = STEPS.indexOf(step);
  const formSteps = STEPS.indexOf("photos");
  const progress = Math.min(100, Math.round((index / formSteps) * 100));
  const pricedClasses = classes.filter((c): c is "group" | "private" => c !== "duet");

  const go = (s: Step) => {
    setError("");
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const n = STEPS[index + 1];
    go(n === "prices" && pricedClasses.length === 0 ? "color" : n);
  };
  const back = () => {
    const p = STEPS[index - 1];
    go(p === "prices" && pricedClasses.length === 0 ? "classes" : p);
  };

  const waDigits = whatsapp.replace(/\D/g, "").replace(/^0/, "").replace(/^90/, "");
  const valid: Partial<Record<Step, boolean>> = {
    studio: studio.trim().length >= 2 && !!logo,
    location: district.trim().length >= 2,
    contact: /^5\d{9}$/.test(waDigits),
    classes: classes.length > 0,
  };

  useEffect(() => {
    if (step !== "build") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [step]);

  async function build() {
    go("build");
    setElapsed(0);
    const fd = new FormData();
    fd.set("studio", studio.trim());
    fd.set("district", district.trim());
    fd.set("city", city.trim());
    fd.set("address", address.trim());
    fd.set("whatsapp", whatsapp);
    fd.set("instagram", instagram.trim());
    fd.set("accent", accent);
    fd.set("website", honeypot.current?.value ?? "");
    classes.forEach((c) => fd.append("classes", c));
    pricedClasses.forEach((c) => prices[c].forEach((p, i) => fd.set(`price_${c}_${[4, 8, 12][i]}`, p)));
    if (logo) fd.set("logo", logo);
    PHOTO_SLOTS.forEach(({ key }) => photos[key] && fd.set(key, photos[key]!));
    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Site oluşturulamadı, lütfen tekrar dene.");
      setResult(json);
      go("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("photos");
    }
  }

  const fullUrl = result ? `${window.location.origin}${result.url}` : "";
  const waHref = `https://wa.me/${RD_WHATSAPP}?text=${encodeURIComponent(`Merhaba, internet sitemi istiyorum: ${fullUrl}`)}`;
  const stage = [...BUILD_STAGES].reverse().find((s) => elapsed >= s.at)!;

  return (
    <div className="sy">
      <DotGrid />
      <div className="sy-glow" aria-hidden />
      <main className="sy-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sy-logo" src="/rd-logo.webp" alt="Reformer Dijital" width={150} height={150} />
        <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" className="sy-hp" aria-hidden />

        {index > 0 && index <= formSteps ? (
          <div className="sy-progress" aria-hidden>
            <i style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        <div className="sy-card sy-step" key={step}>
          {step === "intro" && (
            <>
              <p className="sy-eyebrow">Site Yapıcı</p>
              <h1>
                Siteni yap, <span className="sy-hl">tek tıkla</span> yayınla.
              </h1>
              <p className="sy-sub">
                Logonu yükle, birkaç soruyu cevapla. Reformer stüdyon için hazırlanmış siten birkaç dakika içinde önünde.
              </p>
              <p className="sy-badge">İlk 1 ay ücretsiz kullan</p>
              <div className="sy-actions">
                <button className="sy-btn" onClick={next}>
                  Siteni yap <Arrow />
                </button>
                <a className="sy-link" href="/s/alys-pilates" target="_blank" rel="noopener noreferrer">
                  Örnek siteyi gör
                </a>
              </div>
            </>
          )}

          {step === "studio" && (
            <Question title="Stüdyonun adı ve logosu" sub="Logon aynen korunur, sadece yüksek çözünürlükte yeniden çizilir.">
              <Field label="Stüdyo adı">
                <input className="sy-input" value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="Örn. ALYS Pilates" maxLength={60} autoFocus />
              </Field>
              <FileDrop label="Logo" hint="PNG, JPG veya WEBP · en fazla 10 MB" file={logo} onFile={setLogo} />
            </Question>
          )}

          {step === "location" && (
            <Question title="Stüdyon nerede?" sub='Sitedeki "Yerimiz nerede?" butonu bu adrese yol tarifi verir.'>
              <div className="sy-row">
                <Field label="İlçe">
                  <input className="sy-input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Örn. Çekmeköy" maxLength={40} autoFocus />
                </Field>
                <Field label="Şehir">
                  <input className="sy-input" value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
                </Field>
              </div>
              <Field label="Açık adres (isteğe bağlı)">
                <input className="sy-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mahalle, cadde, no" maxLength={160} />
              </Field>
            </Question>
          )}

          {step === "contact" && (
            <Question title="Üyeler sana nereden ulaşsın?" sub="Sitedeki tüm butonlar bu WhatsApp numarasına mesaj açar.">
              <Field label="Stüdyonun WhatsApp numarası">
                <input className="sy-input" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="05xx xxx xx xx" maxLength={20} autoFocus />
              </Field>
              <Field label="Instagram kullanıcı adı (isteğe bağlı)">
                <input className="sy-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@stüdyon" maxLength={40} />
              </Field>
            </Question>
          )}

          {step === "classes" && (
            <Question title="Hangi dersleri veriyorsun?" sub="Birden fazla seçebilirsin.">
              <div className="sy-options">
                {CLASS_OPTIONS.map((o) => {
                  const on = classes.includes(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      className={`sy-opt${on ? " sel" : ""}`}
                      aria-pressed={on}
                      onClick={() => setClasses(on ? classes.filter((c) => c !== o.key) : [...classes, o.key])}
                    >
                      <span className="sy-dot" aria-hidden />
                      <span>
                        {o.label}
                        <small>{o.hint}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}

          {step === "prices" && (
            <Question title="Aylık paket fiyatların" sub='Boş bıraktıkların sitede "Fiyat için yazın" olarak görünür.'>
              {pricedClasses.map((c) => (
                <div key={c} className="sy-price-group">
                  <p className="sy-label">{c === "group" ? "Grup ders" : "Özel ders"}</p>
                  <div className="sy-row sy-row-3">
                    {PLAN_LABELS.map((l, i) => (
                      <Field key={l} label={l}>
                        <span className="sy-money">
                          <input
                            className="sy-input"
                            inputMode="numeric"
                            value={prices[c][i]}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                              setPrices({ ...prices, [c]: prices[c].map((p, j) => (j === i ? v : p)) });
                            }}
                            placeholder="—"
                          />
                          <span>₺</span>
                        </span>
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </Question>
          )}

          {step === "color" && (
            <Question title="Vurgu rengin" sub="Butonlar bu renkte olur. Renk istemezsen beyaz kalır.">
              <div className="sy-swatches">
                {SWATCHES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className={`sy-swatch${accent === s.value ? " sel" : ""}`}
                    style={{ "--sw": s.value || "#fafafa" } as React.CSSProperties}
                    aria-pressed={accent === s.value}
                    onClick={() => setAccent(s.value)}
                  >
                    <i aria-hidden />
                    {s.label}
                  </button>
                ))}
                <label className={`sy-swatch sy-custom${SWATCHES.every((s) => s.value !== accent) ? " sel" : ""}`}>
                  <input type="color" value={accent || "#ffffff"} onChange={(e) => setAccent(e.target.value)} />
                  Kendi rengin
                </label>
              </div>
            </Question>
          )}

          {step === "photos" && (
            <Question title="Stüdyondan fotoğraflar" sub="İsteğe bağlı. Yüklemezsen sitene uygun hazır görsellerimizi kullanırız.">
              <div className="sy-row sy-row-3">
                {PHOTO_SLOTS.map((p) => (
                  <FileDrop key={p.key} compact label={p.label} hint={p.hint} file={photos[p.key] ?? null} onFile={(f) => setPhotos({ ...photos, [p.key]: f })} />
                ))}
              </div>
              {error ? <p className="sy-error">{error}</p> : null}
            </Question>
          )}

          {step === "build" && (
            <div className="sy-building" role="status" aria-live="polite">
              <div className="sy-spinner" aria-hidden />
              <h1>Siten hazırlanıyor</h1>
              <p className="sy-sub">{stage.text}…</p>
              <p className="sy-timer">{elapsed} sn · genelde 1–2 dakika sürer</p>
            </div>
          )}

          {step === "done" && result && (
            <>
              <p className="sy-eyebrow">Hazır</p>
              <h1>
                <span className="sy-hl">{studio}</span> sitesi hazır.
              </h1>
              <p className="sy-sub">Siteni aç, gez. Beğenirsen tek mesajla yayına alalım. İlk 1 ay ücretsiz.</p>
              <div className="sy-actions">
                <a className="sy-btn" href={result.url} target="_blank" rel="noopener noreferrer">
                  Siteni aç <Arrow />
                </a>
                <a className="sy-btn sy-btn-ghost" href={waHref} target="_blank" rel="noopener noreferrer">
                  Beğendim, yayına alın
                </a>
                <p className="sy-url">{fullUrl}</p>
              </div>
            </>
          )}

          {index > 0 && index <= formSteps ? (
            <div className="sy-actions">
              {step === "photos" ? (
                <button className="sy-btn" onClick={build}>
                  Sitemi oluştur <Arrow />
                </button>
              ) : (
                <button className="sy-btn" onClick={next} disabled={valid[step] === false}>
                  Devam <Arrow />
                </button>
              )}
              <button className="sy-back" onClick={back}>
                Geri
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Question({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <>
      <h1 className="sy-q">{title}</h1>
      {sub ? <p className="sy-sub">{sub}</p> : null}
      <div className="sy-fields">{children}</div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="sy-field">
      <span className="sy-label">{label}</span>
      {children}
    </label>
  );
}

function FileDrop({
  label,
  hint,
  file,
  onFile,
  compact = false,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  compact?: boolean;
}) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return (
    <label className={`sy-drop${compact ? " compact" : ""}${file ? " has" : ""}`}>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {file ? <img src={url} alt="" /> : <span className="sy-plus" aria-hidden>+</span>}
      <span className="sy-drop-text">
        <strong>{file ? file.name : label}</strong>
        <small>{file ? "Değiştirmek için dokun" : hint}</small>
      </span>
    </label>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Reformer Dijital's animated #ff00ff dot grid (same as /kazanc and /vitrin). */
function DotGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const gap = 26;
    let w = 0;
    let h = 0;
    let raf = 0;
    let start = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const drift = (t * 0.006) % gap;
      for (let r = 0; r < Math.ceil(h / gap) + 2; r++)
        for (let c = 0; c < Math.ceil(w / gap) + 2; c++) {
          const x = c * gap;
          const y = r * gap - gap + drift;
          const pulse = 0.35 + 0.65 * (Math.sin(x * 0.012 + y * 0.012 + t * 0.0009) * 0.5 + 0.5);
          ctx.beginPath();
          ctx.arc(x, y, 0.6 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,0,255,${(0.1 + pulse * 0.22).toFixed(3)})`;
          ctx.fill();
        }
    };
    const loop = (now: number) => {
      if (!start) start = now;
      draw(now - start);
      raf = requestAnimationFrame(loop);
    };
    resize();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);
    const onResize = () => {
      resize();
      if (reduce) draw(0);
    };
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={ref} className="sy-dots" aria-hidden />;
}
