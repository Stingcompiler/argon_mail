'use client';
import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Small motion helpers, no animation library. Everything else is plain CSS
 * (see the "Motion" block at the end of globals.css). All of it is skipped
 * when the visitor asks the system for reduced motion.
 */

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// useLayoutEffect warns during server rendering; these only matter in the browser.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * A group of toggle buttons (tabs, filters) whose highlight slides to the
 * selected one. The selected button is the one with aria-pressed="true".
 * Until the script runs, the selected button paints its own background, so
 * server HTML looks the same without JavaScript.
 */
export function SlidingGroup({ active, children, ...rest }: HTMLAttributes<HTMLDivElement> & { active: unknown; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>(':scope > [aria-pressed="true"]');
      if (!on) { delete el.dataset.pill; return; }
      el.style.setProperty('--pill-x', `${on.offsetLeft}px`);
      el.style.setProperty('--pill-y', `${on.offsetTop}px`);
      el.style.setProperty('--pill-w', `${on.offsetWidth}px`);
      el.style.setProperty('--pill-h', `${on.offsetHeight}px`);
      // First placement without a transition, so it doesn't slide in from 0.
      if (!el.dataset.pill) { el.dataset.pill = 'placed'; requestAnimationFrame(() => { if (el.dataset.pill) el.dataset.pill = 'ready'; }); }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);
  return <div ref={ref} {...rest}>{children}</div>;
}

/** Counts up to `value` (ease-out, ~0.7s) the first time it is known and on change. */
export function CountUp({ value, pad = 2 }: { value: number | null | undefined; pad?: number }) {
  const [shown, setShown] = useState<number | null>(null);
  const from = useRef(0);
  useEffect(() => {
    if (value == null) return;
    if (reducedMotion()) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(a + (value - a) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (value == null) return <>…</>;
  // Screen readers get the final number, not every step.
  return <span className="count-up"><span className="sr-only">{value}</span><span aria-hidden="true">{String(shown ?? 0).padStart(pad, '0')}</span></span>;
}
