'use client';
import { useEffect } from 'react';
import { eventForLink, track } from '@/lib/analytics';

/** One delegated listener for link events across the public site. */
export function AnalyticsClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const event = eventForLink(a);
      if (event) track(event);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
