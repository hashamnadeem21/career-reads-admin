"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";

/** Counts up once when first visible. Renders the final value for no-JS, SSR and reduced motion. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      observer.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      setShown(0);
      requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="num">
      <span className="sr-only">{formatNumber(value)}</span>
      <span aria-hidden>{formatNumber(shown)}</span>
    </span>
  );
}
