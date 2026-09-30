'use client';
import { useEffect, useState } from 'react';

/**
 * Progress dots under the phone's swipeable services row: a visible cue that
 * more cards follow, and which one is in view. Decorative (the cards are the
 * links), so hidden from assistive technology and from the desktop grid. It
 * also keeps a keyboard-focused card fully in view.
 */
export function CarouselDots({ count, target }: { count: number; target: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const row = document.querySelector<HTMLElement>(target);
    if (!row) return;
    // Scroll events already arrive at most once per frame; the work is a few reads.
    const update = () => {
      const card = row.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + parseFloat(getComputedStyle(row).columnGap || '0');
      // RTL rows scroll to negative offsets; the end of the row counts as the last card.
      const x = Math.abs(row.scrollLeft);
      const atEnd = x + row.clientWidth >= row.scrollWidth - 4;
      setActive(atEnd && x > 0 ? count - 1 : Math.min(count - 1, Math.round(x / step)));
    };
    // Keyboard focus: the browser scrolls a focused card into view, then
    // mandatory snapping can pull the row back to the previous card, leaving
    // the focused one half off-screen. Align it to its own snap point instead.
    const onFocus = (e: FocusEvent) => {
      if (getComputedStyle(row).overflowX === 'visible') return; // desktop grid
      const card = [...row.children].find((c) => c.contains(e.target as Node));
      card?.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'instant' });
    };
    row.addEventListener('scroll', update, { passive: true });
    row.addEventListener('focusin', onFocus);
    return () => { row.removeEventListener('scroll', update); row.removeEventListener('focusin', onFocus); };
  }, [target, count]);
  if (count < 2) return null;
  return (
    <div className="carousel-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <span key={i} className={i === active ? 'on' : undefined} />)}
    </div>
  );
}
