/**
 * Soft blur at the screen edge while scrolling (port of 21st "edge-blur").
 * Stacked backdrop-blur layers, each faded out with a gradient mask; kept to
 * three light layers so phones stay smooth. Plain CSS, no Tailwind.
 */
type Props = { position?: "top" | "bottom"; height?: number; className?: string };

const LAYERS = [1, 2, 4];

export function EdgeBlur({ position = "bottom", height = 64, className = "" }: Props) {
  const mask = `linear-gradient(to ${position === "top" ? "bottom" : "top"}, #000, transparent)`;
  return (
    <div className={`edge-blur edge-blur-${position} ${className}`} style={{ height }} aria-hidden>
      {LAYERS.map((b) => (
        <div
          key={b}
          style={{ backdropFilter: `blur(${b}px)`, WebkitBackdropFilter: `blur(${b}px)`, maskImage: mask, WebkitMaskImage: mask }}
        />
      ))}
    </div>
  );
}
