"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const RD_WHATSAPP = "905454498280";

const SERVICE_SUGGESTIONS = ["Reformer grup", "Özel ders", "Düet", "Mat pilates", "Fonksiyonel antrenman", "Hamile pilatesi"];
const SWATCHES = [
  { label: "Pembe", value: "#d6249f" },
  { label: "Mor", value: "#7a3fb0" },
  { label: "Altın", value: "#b8902f" },
  { label: "Yeşil", value: "#2f8f4e" },
  { label: "Mavi", value: "#2f63c9" },
  { label: "Beyaz", value: "" },
];

type Pkg = { sessions: string; price: string };
type Service = { name: string; packages: Pkg[] };
type Trainer = { name: string; info: string; photo: File | null };
type Review = { name: string; text: string };

const STEPS = ["intro", "studio", "photos", "location", "contact", "services", "trainers", "reviews", "color", "build", "done"] as const;
type Step = (typeof STEPS)[number];

const BUILD_STAGES = [
  { at: 0, text: "Logondan renk paletin çıkarılıyor" },
  { at: 5, text: "Site metinlerin yazılıyor" },
  { at: 14, text: "Salonundan kapak fotoğrafın hazırlanıyor" },
  { at: 55, text: "Logon siteye yerleştiriliyor" },
  { at: 80, text: "Son dokunuşlar yapılıyor" },
];

const newPkg = (): Pkg => ({ sessions: "", price: "" });

export function Builder() {
  const [step, setStep] = useState<Step>("intro");
  const [studio, setStudio] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [services, setServices] = useState<Service[]>([{ name: "Reformer grup", packages: [newPkg(), newPkg(), newPkg()] }]);
  const [hasTrainers, setHasTrainers] = useState<boolean | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([{ name: "", info: "", photo: null }]);
  const [reviews, setReviews] = useState<Review[]>([{ name: "", text: "" }]);
  const [accent, setAccent] = useState<string>("auto");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const honeypot = useRef<HTMLInputElement>(null);

  const index = STEPS.indexOf(step);
  const lastForm = STEPS.indexOf("color");
  const progress = Math.round((index / lastForm) * 100);

  const go = (s: Step) => {
    setError("");
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => go(STEPS[index + 1]);
  const back = () => go(STEPS[index - 1]);

  const waDigits = whatsapp.replace(/\D/g, "").replace(/^0/, "").replace(/^90/, "");
  const cleanServices = services
    .map((s) => ({ name: s.name.trim(), packages: s.packages.filter((p) => Number(p.sessions) > 0) }))
    .filter((s) => s.name && s.packages.length);
  const cleanTrainers = trainers.filter((t) => t.name.trim());
  const valid: Partial<Record<Step, boolean>> = {
    studio: studio.trim().length >= 2 && !!logo,
    location: district.trim().length >= 2,
    contact: /^5\d{9}$/.test(waDigits),
    services: cleanServices.length > 0,
    trainers: hasTrainers === false || (hasTrainers === true && cleanTrainers.length > 0),
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
    const realTrainers = hasTrainers ? cleanTrainers : [];
    const payload = {
      studio: studio.trim(),
      district: district.trim(),
      city: city.trim(),
      address: address.trim(),
      whatsapp,
      instagram: instagram.trim(),
      accent,
      services: cleanServices.map((s) => ({
        name: s.name,
        packages: s.packages.map((p) => ({ sessions: Number(p.sessions), price: Number(p.price.replace(/\D/g, "")) || null })),
      })),
      trainers: realTrainers.map((t) => ({ name: t.name.trim(), info: t.info.trim() })),
      reviews: reviews.filter((r) => r.name.trim() && r.text.trim()).map((r) => ({ name: r.name.trim(), text: r.text.trim() })),
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    fd.set("website", honeypot.current?.value ?? "");
    if (logo) fd.set("logo", logo);
    photos.forEach((p, i) => p && fd.set(`photo_${i}`, p));
    realTrainers.forEach((t, i) => t.photo && fd.set(`trainer_${i}`, t.photo));
    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Site oluşturulamadı, lütfen tekrar dene.");
      setResult(json);
      go("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("color");
    }
  }

  const fullUrl = result ? `${window.location.origin}${result.url}` : "";
  const waHref = `https://wa.me/${RD_WHATSAPP}?text=${encodeURIComponent(`Merhaba, internet sitemi istiyorum: ${fullUrl}`)}`;
  const stage = [...BUILD_STAGES].reverse().find((s) => elapsed >= s.at)!;

  const setService = (i: number, s: Service) => setServices(services.map((x, j) => (j === i ? s : x)));

  return (
    <div className="sy">
      <DotGrid />
      <div className="sy-glow" aria-hidden />
      <main className="sy-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sy-logo" src="/rd-logo.webp" alt="Reformer Dijital" width={150} height={150} />
        <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" className="sy-hp" aria-hidden />

        {index > 0 && index <= lastForm ? (
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
                Logonu ve salonunun fotoğraflarını yükle, birkaç soruyu cevapla. Kendi renklerinde, kendi salonunda çekilmiş gibi görünen siten birkaç dakikada önünde.
              </p>
              <p className="sy-badge">İlk 1 ay ücretsiz kullan</p>
              <div className="sy-actions">
                <button className="sy-btn" onClick={next}>
                  Siteni yap <Arrow />
                </button>
                <a className="sy-link" href="/s/payluna" target="_blank" rel="noopener noreferrer">
                  Örnek siteyi gör
                </a>
              </div>
            </>
          )}

          {step === "studio" && (
            <Question title="Stüdyonun adı ve logosu" sub="Logon aynen korunur. Sitenin renkleri logondan otomatik çıkarılır.">
              <Field label="Stüdyo adı">
                <input className="sy-input" value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="Örn. Payluna Pilates Studio" maxLength={60} autoFocus />
              </Field>
              <FileDrop label="Logo" hint="PNG, JPG veya WEBP · en fazla 10 MB" file={logo} onFile={setLogo} />
            </Question>
          )}

          {step === "photos" && (
            <Question
              title="Salonundan fotoğraflar"
              sub="Telefonla çekmen yeterli. Sitendeki fotoğraflar senin salonunda çekilmiş gibi hazırlanır. Ne kadar net olursa o kadar iyi."
            >
              <div className="sy-row sy-row-3">
                {["Salonun genel hali", "Reformerlar", "Başka bir açı"].map((label, i) => (
                  <FileDrop
                    key={label}
                    compact
                    label={label}
                    hint={i === 0 ? "En önemlisi" : "İsteğe bağlı"}
                    file={photos[i]}
                    onFile={(f) => setPhotos(photos.map((p, j) => (j === i ? f : p)))}
                  />
                ))}
              </div>
              {!photos.some(Boolean) ? <p className="sy-note">Fotoğraf yüklemezsen markana uygun genel bir stüdyo görseli kullanırız.</p> : null}
            </Question>
          )}

          {step === "location" && (
            <Question title="Stüdyon nerede?" sub='Sitedeki "Yerimiz nerede?" butonu bu adrese yol tarifi verir.'>
              <div className="sy-row">
                <Field label="İlçe">
                  <input className="sy-input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Örn. Bakırköy" maxLength={40} autoFocus />
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

          {step === "services" && (
            <Question title="Hizmetlerin neler?" sub="Her hizmetin seans paketlerini ve fiyatını yaz. Fiyatı boş bırakırsan sitede “Fiyat için yazın” görünür.">
              {services.map((svc, i) => (
                <div key={i} className="sy-service">
                  <div className="sy-service-head">
                    <input
                      className="sy-input"
                      value={svc.name}
                      onChange={(e) => setService(i, { ...svc, name: e.target.value })}
                      placeholder="Hizmet adı"
                      maxLength={40}
                      list="sy-service-names"
                    />
                    {services.length > 1 ? (
                      <button type="button" className="sy-x" aria-label="Hizmeti sil" onClick={() => setServices(services.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    ) : null}
                  </div>
                  {svc.packages.map((p, k) => (
                    <div key={k} className="sy-pkg">
                      <span className="sy-money">
                        <input
                          className="sy-input"
                          inputMode="numeric"
                          value={p.sessions}
                          placeholder="8"
                          onChange={(e) =>
                            setService(i, { ...svc, packages: svc.packages.map((x, j) => (j === k ? { ...x, sessions: e.target.value.replace(/\D/g, "").slice(0, 3) } : x)) })
                          }
                        />
                        <span>seans</span>
                      </span>
                      <span className="sy-money">
                        <input
                          className="sy-input"
                          inputMode="numeric"
                          value={p.price}
                          placeholder="Fiyat"
                          onChange={(e) =>
                            setService(i, { ...svc, packages: svc.packages.map((x, j) => (j === k ? { ...x, price: e.target.value.replace(/\D/g, "").slice(0, 7) } : x)) })
                          }
                        />
                        <span>₺</span>
                      </span>
                      {svc.packages.length > 1 ? (
                        <button type="button" className="sy-x" aria-label="Paketi sil" onClick={() => setService(i, { ...svc, packages: svc.packages.filter((_, j) => j !== k) })}>
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {svc.packages.length < 6 ? (
                    <button type="button" className="sy-add" onClick={() => setService(i, { ...svc, packages: [...svc.packages, newPkg()] })}>
                      + Paket ekle
                    </button>
                  ) : null}
                </div>
              ))}
              <datalist id="sy-service-names">
                {SERVICE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {services.length < 6 ? (
                <div className="sy-chips">
                  {SERVICE_SUGGESTIONS.filter((s) => !services.some((x) => x.name === s)).map((s) => (
                    <button key={s} type="button" className="sy-chip" onClick={() => setServices([...services, { name: s, packages: [newPkg(), newPkg()] }])}>
                      + {s}
                    </button>
                  ))}
                  <button type="button" className="sy-chip" onClick={() => setServices([...services, { name: "", packages: [newPkg()] }])}>
                    + Başka hizmet
                  </button>
                </div>
              ) : null}
            </Question>
          )}

          {step === "trainers" && (
            <Question title="Eğitmenin var mı?" sub="Varsa sitede “Eğitmenlerimiz” bölümü açılır. Yazdığın bilgileri biz düzgün bir metne çeviririz.">
              <div className="sy-options sy-options-2">
                {[
                  { v: true, label: "Evet, var" },
                  { v: false, label: "Hayır, şimdilik yok" },
                ].map((o) => (
                  <button key={o.label} type="button" className={`sy-opt${hasTrainers === o.v ? " sel" : ""}`} aria-pressed={hasTrainers === o.v} onClick={() => setHasTrainers(o.v)}>
                    <span className="sy-dot" aria-hidden />
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
              {hasTrainers
                ? trainers.map((t, i) => (
                    <div key={i} className="sy-service">
                      <div className="sy-service-head">
                        <input
                          className="sy-input"
                          value={t.name}
                          onChange={(e) => setTrainers(trainers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                          placeholder="Eğitmenin adı soyadı"
                          maxLength={50}
                        />
                        {trainers.length > 1 ? (
                          <button type="button" className="sy-x" aria-label="Eğitmeni sil" onClick={() => setTrainers(trainers.filter((_, j) => j !== i))}>
                            ×
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        className="sy-input sy-textarea"
                        value={t.info}
                        onChange={(e) => setTrainers(trainers.map((x, j) => (j === i ? { ...x, info: e.target.value } : x)))}
                        placeholder="Kısaca anlat: kaç yıldır eğitmen, hangi eğitimleri aldı, neyle ilgileniyor…"
                        maxLength={600}
                        rows={3}
                      />
                      <FileDrop label="Fotoğrafı (isteğe bağlı)" hint="Yoksa baş harfleri görünür" file={t.photo} onFile={(f) => setTrainers(trainers.map((x, j) => (j === i ? { ...x, photo: f } : x)))} />
                    </div>
                  ))
                : null}
              {hasTrainers && trainers.length < 4 ? (
                <button type="button" className="sy-add" onClick={() => setTrainers([...trainers, { name: "", info: "", photo: null }])}>
                  + Eğitmen ekle
                </button>
              ) : null}
            </Question>
          )}

          {step === "reviews" && (
            <Question title="Öğrenci yorumların" sub="İsteğe bağlı. Google veya Instagram'daki yorumları kopyalayabilirsin. Boş bırakırsan örnek yorumlar konur ve sitede “örnek” notu görünür.">
              {reviews.map((r, i) => (
                <div key={i} className="sy-service">
                  <div className="sy-service-head">
                    <input
                      className="sy-input"
                      value={r.name}
                      onChange={(e) => setReviews(reviews.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="Ad (örn. Elif K.)"
                      maxLength={40}
                    />
                    {reviews.length > 1 ? (
                      <button type="button" className="sy-x" aria-label="Yorumu sil" onClick={() => setReviews(reviews.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    className="sy-input sy-textarea"
                    value={r.text}
                    onChange={(e) => setReviews(reviews.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    placeholder="Yorum"
                    maxLength={400}
                    rows={2}
                  />
                </div>
              ))}
              {reviews.length < 8 ? (
                <button type="button" className="sy-add" onClick={() => setReviews([...reviews, { name: "", text: "" }])}>
                  + Yorum ekle
                </button>
              ) : null}
            </Question>
          )}

          {step === "color" && (
            <Question title="Renkler" sub="Varsayılan: logondaki renklerden otomatik. İstersen buton rengini kendin seç.">
              <div className="sy-swatches">
                <button type="button" className={`sy-swatch sy-auto${accent === "auto" ? " sel" : ""}`} aria-pressed={accent === "auto"} onClick={() => setAccent("auto")}>
                  <i aria-hidden />
                  Logodan otomatik
                </button>
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

          {index > 0 && index <= lastForm ? (
            <div className="sy-actions">
              {step === "color" ? (
                <button className="sy-btn" onClick={build}>
                  Sitemi oluştur <Arrow />
                </button>
              ) : (
                <button className="sy-btn" onClick={next} disabled={valid[step] === false}>
                  {step === "photos" && !photos.some(Boolean) ? "Fotoğrafsız devam et" : step === "reviews" && !reviews.some((r) => r.text.trim()) ? "Şimdilik geç" : "Devam"} <Arrow />
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
      <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
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
