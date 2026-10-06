"use client";

import { useEffect, useRef } from "react";

/**
 * Light pages: "silk" texture behind everything (port of 21st
 * "silk-background-animation"), recoloured to the studio's own colour.
 *
 * Phones first: the silk is drawn ONCE (at 1/8 resolution, scaled up by CSS —
 * silk is soft, so it stays smooth) and then drifts with a CSS transform,
 * which the GPU moves without repainting. No per-frame JavaScript, and no
 * redraw when iOS Safari's address bar resizes the viewport (that redraw was
 * the blink).
 */
type RGB = [number, number, number];

const rgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

export function SilkBackground({ bg, tint }: { bg: string; tint: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const base = rgb(bg);
    // Folds in a soft shade of the studio colour, crests a touch lighter than the page.
    const low = mix(base, rgb(tint), 0.4);
    const high = mix(base, [255, 255, 255], 0.55);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.ceil(rect.width / 8);
      const h = Math.ceil(rect.height / 8);
      canvas.width = w;
      canvas.height = h;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const aspect = h / w;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = (x / w) * 2;
          const v = (y / h) * 2 * aspect * 0.6 + 0.03 * Math.sin(8 * u);
          const p = 0.6 + 0.4 * Math.sin(5 * (u + v + Math.cos(3 * u + 5 * v)) + Math.sin(20 * (u + v)));
          const k = Math.min(1, Math.max(0, p));
          const i = (y * w + x) * 4;
          d[i] = low[0] + (high[0] - low[0]) * k;
          d[i + 1] = low[1] + (high[1] - low[1]) * k;
          d[i + 2] = low[2] + (high[2] - low[2]) * k;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    draw();
    // Only a real width change (rotation) redraws; height changes from the URL bar are ignored.
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      draw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bg, tint]);

  return <canvas ref={ref} className="silk-bg" aria-hidden />;
}
