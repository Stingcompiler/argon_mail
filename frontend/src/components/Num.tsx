import type { ReactNode } from 'react';

/**
 * The numerals rule (docs/design/DESIGN.md): amounts, dates, times, ids,
 * phones, codes, counters and step numbers sit in `.num` — the mono token,
 * tabular figures, left-to-right and isolated from the Arabic around them.
 */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className ? `num ${className}` : 'num'}>{children}</span>;
}

// A run of digits with the separators that belong inside it (1,250.50 · 10:30 · 2026-10-24 · +249).
const RUN = /(\+?\d(?:[\d.,:/\-]*\d)?)/;

/**
 * A sentence that contains numbers («24 أكتوبر 2026»، «يبدأ من 15,000 SDG»):
 * only the digit runs become `.num`, so the Arabic keeps its order.
 */
export function Nums({ text }: { text: string | number | null | undefined }) {
  if (text === null || text === undefined) return null;
  const parts = String(text).split(RUN);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="num">{p}</span> : p))}</>;
}
