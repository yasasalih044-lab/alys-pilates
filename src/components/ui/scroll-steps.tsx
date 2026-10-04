"use client";

// Vertical stepper (step 1 ✓ → step 2 → step 3) whose rail fills as the page
// scrolls. Without JS every step is shown as a plain, readable list.
import { useEffect, useRef } from "react";

type Step = { title: string; body: string };

export function ScrollSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLLIElement>(".journey-step")];
    let frame = 0;

    const update = () => {
      frame = 0;
      // The "reading line" sits a little above the middle of the viewport.
      const line = innerHeight * 0.55;
      const first = items[0].querySelector(".journey-dot")!.getBoundingClientRect();
      const last = items[items.length - 1].querySelector(".journey-dot")!.getBoundingClientRect();
      const start = first.top + first.height / 2;
      const end = last.top + last.height / 2;
      const progress = Math.min(1, Math.max(0, (line - start) / Math.max(1, end - start)));
      list.style.setProperty("--progress", progress.toFixed(4));

      items.forEach((item) => {
        const dot = item.querySelector(".journey-dot")!.getBoundingClientRect();
        const center = dot.top + dot.height / 2;
        const state = center < line - 40 ? "done" : center < line + 40 ? "current" : "next";
        if (item.dataset.state !== state) item.dataset.state = state;
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    list.dataset.enhanced = "true";
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <ol className="journey" ref={ref}>
      <span className="journey-rail" aria-hidden>
        <span className="journey-fill" />
      </span>
      {steps.map((step, i) => (
        <li key={step.title} className="journey-step" data-state="next">
          <span className="journey-dot" aria-hidden>
            <span className="journey-num">{i + 1}</span>
            <svg className="journey-check" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="journey-copy">
            <span className="journey-kicker">Adım {String(i + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
