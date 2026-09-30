'use client';
import { useState, type ReactNode } from 'react';

// True after the first page of the visit has rendered in this browser.
let firstPageShown = false;

/**
 * A new page fades in when you move around the site. Never on the first
 * page of a visit: animating it would delay its first paint (LCP). The
 * server always renders without the class, so hydration matches.
 */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  const [animate] = useState(() => {
    if (typeof window === 'undefined') return false;
    const a = firstPageShown;
    firstPageShown = true;
    return a;
  });
  return <div className={animate ? 'page-enter' : undefined}>{children}</div>;
}
