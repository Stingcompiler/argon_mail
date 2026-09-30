'use client';
import { useEffect, useState } from 'react';

/**
 * Progress dots under the phone's swipeable services row: a visible cue that
 * more cards follow, and which one is in view. Decorative (the cards are the
 * links, and keyboard focus scrolls them into view), so hidden from assistive
 * technology and from the desktop grid.
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
    row.addEventListener('scroll', update, { passive: true });
    return () => row.removeEventListener('scroll', update);
  }, [target, count]);
  if (count < 2) return null;
  return (
    <div className="carousel-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <span key={i} className={i === active ? 'on' : undefined} />)}
    </div>
  );
}
