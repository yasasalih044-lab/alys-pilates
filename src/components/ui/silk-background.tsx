"use client";

import { useEffect, useRef } from "react";

/**
 * Light pages: slow "silk" texture behind everything (port of 21st
 * "silk-background-animation"), recoloured to the studio's own colour.
 * Phone-friendly: drawn at 1/8 resolution and scaled up by CSS (silk is soft,
 * so it stays smooth), ~24 fps, paused in background tabs, one still frame
 * with reduced motion.
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
    const SCALE = 8;
    let img: ImageData;

    const resize = () => {
      canvas.width = Math.ceil(window.innerWidth / SCALE);
      canvas.height = Math.ceil(window.innerHeight / SCALE);
      img = ctx.createImageData(canvas.width, canvas.height);
    };

    const draw = (t: number) => {
      const { width: w, height: h } = canvas;
      const d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = (x / w) * 2;
          const v = (y / h) * 2 + 0.03 * Math.sin(8 * u - t);
          const p = 0.6 + 0.4 * Math.sin(5 * (u + v + Math.cos(3 * u + 5 * v) + 0.02 * t) + Math.sin(20 * (u + v - 0.1 * t)));
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

    resize();
    window.addEventListener("resize", resize);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 0;
    let last = 0;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 42) return;
      t += ((now - (last || now)) / 1000) * 1.2;
      last = now;
      draw(t);
    };
    if (still) draw(0);
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [bg, tint]);

  return <canvas ref={ref} className="silk-bg" aria-hidden />;
}
