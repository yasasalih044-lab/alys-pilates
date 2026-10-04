"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement only: every element is visible and every link works
 * without this. Mobile menu, current-section pill, one-time entrance motion,
 * single-open process steps and the marquee pause button.
 */
export function SiteBehavior() {
  useEffect(() => {
    const root = document.documentElement;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof DocumentEventMap>(
      target: Document | Element | Window,
      type: K | string,
      fn: EventListener,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    };

    // Mobile menu
    const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
    const menu = document.querySelector<HTMLElement>(".nav-links");
    const closeMenu = () => {
      menu?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    };
    if (toggle && menu) {
      on(toggle, "click", () => {
        const open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      menu.querySelectorAll("a").forEach((a) => on(a, "click", closeMenu));
      on(document, "keydown", ((e: KeyboardEvent) => {
        if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
          closeMenu();
          toggle.focus();
        }
      }) as EventListener);
    }

    // Current section pill in the nav
    const links = [...document.querySelectorAll<HTMLAnchorElement>(".nav-links a[href^='#']")]
      .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
      .filter((x): x is { link: HTMLAnchorElement; section: HTMLElement } => Boolean(x.section));
    if (links.length && "IntersectionObserver" in window) {
      const visible = new Set<Element>();
      const upper = Math.min(150, Math.round(innerHeight * 0.18));
      const lower = Math.round(innerHeight * 0.52);
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
          const current = [...visible].sort(
            (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          )[0];
          links.forEach(({ link, section }) =>
            section === current ? link.setAttribute("aria-current", "location") : link.removeAttribute("aria-current"),
          );
        },
        { rootMargin: `-${upper}px 0px -${lower}px 0px` },
      );
      links.forEach(({ section }) => io.observe(section));
      cleanups.push(() => io.disconnect());
    }

    // One-time entrance: starts from visible-ish, never hides content.
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && "IntersectionObserver" in window && "animate" in Element.prototype) {
      const ease = getComputedStyle(root).getPropertyValue("--ease-out").trim();
      const enter = (el: Element, delay = 0) =>
        el.animate(
          [
            { opacity: 0.15, transform: "translateY(14px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 600, delay, easing: ease },
        );
      const io = new IntersectionObserver(
        (entries) => {
          let stagger = 0;
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            enter(e.target, Math.min(stagger++ * 60, 180));
          });
        },
        { threshold: 0.12 },
      );
      document
        .querySelectorAll(".section-heading,.service-card,.about-copy,.principle,.booking-intro,.booking-card")
        .forEach((el) => {
          // Only animate what is still below the fold on load.
          if (el.getBoundingClientRect().top > innerHeight) io.observe(el);
        });
      cleanups.push(() => io.disconnect());
      if (!location.hash) document.querySelectorAll(".hero-copy,.hero-signature").forEach((el, i) => enter(el, i * 60));
    }

    // Process: only one step open at a time
    const steps = [...document.querySelectorAll<HTMLDetailsElement>(".process-step")];
    steps.forEach((step) =>
      on(step, "toggle", () => {
        if (step.open) steps.forEach((other) => other !== step && (other.open = false));
      }),
    );

    // Marquee pause
    document.querySelectorAll<HTMLButtonElement>(".motion-toggle").forEach((btn) =>
      on(btn, "click", () => {
        const paused = root.classList.toggle("motion-paused");
        btn.setAttribute("aria-pressed", String(paused));
        btn.textContent = paused ? btn.dataset.play! : btn.dataset.pause!;
      }),
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
