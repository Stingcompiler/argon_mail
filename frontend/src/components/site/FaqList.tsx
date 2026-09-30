'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FAQItem } from '@/lib/api/types';

/** Answers stay in the HTML so they are indexable; they open and close smoothly. */
export function FaqList({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map((f, i) => (
        <div className={'faq-item ' + (open === i ? 'expanded' : '')} key={f.id}>
          <button aria-expanded={open === i} aria-controls={`faq-${f.id}`} onClick={() => setOpen(open === i ? null : i)}>
            {f.question}<Plus size={18} />
          </button>
          {/* Always in the HTML (indexable). Height animates open/closed in CSS;
              visibility keeps a closed answer out of the keyboard and screen readers. */}
          <div className="faq-answer" id={`faq-${f.id}`} data-open={open === i}><div><p>{f.answer}</p></div></div>
        </div>
      ))}
    </div>
  );
}
