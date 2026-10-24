"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { GROUND_OPTIONS, PICKER_START, isHexColour } from "@/lib/grounds";
import { SITE_STYLES, type SiteStyle } from "@/lib/styles";
import { memberToken } from "@/lib/fm-kit";

type Edit = { style?: SiteStyle; ground?: string };

/**
 * "Düzenle" on a Site Yapıcı preview: the owner changes the page ground (from
 * the logo, a preset, or any colour) and the style after the site was built.
 * Saves through /api/style and re-renders the page in place; the panel stays
 * open so they can try a few.
 */
export function PreviewEditor({ slug, style, ground }: { slug: string; style: SiteStyle; ground: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState({ style, ground });
  const [picker, setPicker] = useState(isHexColour(ground) ? ground : PICKER_START);
  const [saving, setSaving] = useState<Edit | null>(null);
  const [msg, setMsg] = useState("");
  const pickerRef = useRef<HTMLInputElement>(null);
  const queued = useRef<Edit | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = useRef(false);
  // What the page will show once every save has landed: repeated picks of the same value are skipped.
  const target = useRef({ style, ground });
  // What the page shows now (saved); a ref so queued saves never read a stale render.
  const shown = useRef({ style, ground });
  const closeRef = useRef<HTMLButtonElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after mount
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function save(edit: Edit) {
    if (busy.current) {
      queued.current = { ...queued.current, ...edit };
      return;
    }
    busy.current = true;
    setSaving(edit);
    setMsg("Kaydediliyor…");
    const slow = edit.ground ? setTimeout(() => setMsg("Logon yeni zemine göre hazırlanıyor…"), 3500) : undefined;
    try {
      // 409 = the site is still saving (e.g. the white logo arriving): wait and try again.
      let res: Response | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 1500));
        res = await fetch("/api/style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...edit, m: memberToken() }),
        });
        if (res.status !== 409) break;
      }
      const json = await res!.json().catch(() => ({}));
      if (!res!.ok) throw new Error(json.error || "Kaydedilemedi, lütfen tekrar dene.");
      const now = { style: json.style ?? shown.current.style, ground: json.ground ?? shown.current.ground };
      shown.current = now;
      setCurrent(now);
      setMsg("Kaydedildi.");
      // A "?stil=" comparison link would keep showing the other style: drop it.
      if (window.location.search) router.replace(pathname, { scroll: false });
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      target.current = { ...shown.current };
    } finally {
      clearTimeout(slow);
      busy.current = false;
      setSaving(null);
      const next = queued.current;
      queued.current = null;
      if (next) void save(next);
    }
  }

  const pickGround = (g: string) => {
    if (g === target.current.ground) return;
    target.current.ground = g;
    void save({ ground: g });
  };
  const pickStyle = (k: SiteStyle) => {
    if (k === target.current.style) return;
    target.current.style = k;
    void save({ style: k });
  };

  // Colour picker: save when it closes ("change"), or a moment after the last
  // drag for browsers that only send "input" — never once per drag step.
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const commit = () => {
      clearTimeout(debounce.current);
      pickGround(el.value.toLowerCase());
    };
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  });

  const sel = (on: boolean) => (on ? " sel" : "");
  const disabled = !!saving;

  const sheet = (
    <div className="pv-sheet" id="pv-sheet" role="dialog" aria-labelledby="pv-sheet-title" hidden={!open}>
      <div className="pv-sheet-head">
        <h2 id="pv-sheet-title">Siteni düzenle</h2>
        <button ref={closeRef} type="button" className="pv-close" aria-label="Kapat" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <p className="pv-sheet-label">Zemin rengi</p>
      <div className="pv-chips" role="radiogroup" aria-label="Zemin rengi">
        <button type="button" role="radio" aria-checked={current.ground === "auto"} className={`pv-chip${sel(current.ground === "auto")}`} disabled={disabled} onClick={() => pickGround("auto")}>
          <i className="pv-auto" aria-hidden />
          Logodan
        </button>
        <label className={`pv-chip pv-custom${sel(isHexColour(current.ground))}`} style={{ "--sw": picker } as CSSProperties}>
          <input
            ref={pickerRef}
            type="color"
            value={picker}
            disabled={disabled}
            aria-label="Zemin rengini kendin seç"
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              setPicker(v);
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => pickGround(v), 1200);
            }}
          />
          Renk seç
        </label>
        {GROUND_OPTIONS.map((g) => (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={current.ground === g.value}
            className={`pv-chip${sel(current.ground === g.value)}`}
            style={{ "--sw": g.sw } as CSSProperties}
            disabled={disabled}
            onClick={() => pickGround(g.value)}
          >
            <i aria-hidden />
            {g.label}
          </button>
        ))}
      </div>
      <p className="pv-sheet-label">Tarz</p>
      <div className="pv-chips" role="radiogroup" aria-label="Tarz">
        {SITE_STYLES.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={current.style === o.key}
            className={`pv-chip pv-style${sel(current.style === o.key)}`}
            disabled={disabled}
            onClick={() => pickStyle(o.key)}
          >
            {o.name}
          </button>
        ))}
      </div>
      <p className="pv-status" role="status" aria-live="polite">
        {msg || "Renkler ve logo değişir; yazılar ve fotoğraflar aynı kalır."}
      </p>
    </div>
  );

  return (
    <>
      <button type="button" className="pv-edit" aria-expanded={open} aria-controls="pv-sheet" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
          <path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
        <span>Düzenle</span>
      </button>
      {mounted ? createPortal(sheet, document.body) : null}
    </>
  );
}
