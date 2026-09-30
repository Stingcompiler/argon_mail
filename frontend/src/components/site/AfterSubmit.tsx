'use client';
import { useEffect, useRef } from 'react';

/**
 * «بعد إرسال طلبك»: open on larger screens, folded on phones so «how it works»
 * stays short there (docs/landing-mobile-audit-plan.md, batch 3). The server
 * renders it open (crawlers and no-JavaScript readers see all of it); the
 * phone folds it once, on mount, before it scrolls into view.
 */
export function AfterSubmit({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && matchMedia('(max-width: 760px)').matches) ref.current.open = false;
  }, []);
  return (
    <details className="after-submit" ref={ref} open>
      <summary><h3>بعد إرسال طلبك</h3></summary>
      {children}
    </details>
  );
}
