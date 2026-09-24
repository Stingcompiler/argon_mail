'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FAQItem } from '@/lib/api/types';

/** Answers stay in the HTML (hidden attribute) so they are indexable. */
export function FaqList({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map((f, i) => (
        <div className={'faq-item ' + (open === i ? 'expanded' : '')} key={f.id}>
          <button aria-expanded={open === i} aria-controls={`faq-${f.id}`} onClick={() => setOpen(open === i ? null : i)}>
            {f.question}<Plus size={18} />
          </button>
          <p id={`faq-${f.id}`} hidden={open !== i}>{f.answer}</p>
        </div>
      ))}
    </div>
  );
}
