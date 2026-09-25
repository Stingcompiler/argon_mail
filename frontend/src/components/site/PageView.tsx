import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PublicPage } from '@/lib/api/types';
import { formatDate } from '@/lib/format';

/**
 * Renders a page body written as plain text: blank lines separate
 * paragraphs and "## " starts a heading. Everything is rendered as text,
 * so an edited page can never inject HTML.
 */
export function PageView({ page }: { page: PublicPage }) {
  const blocks = page.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <section className="container policy-page">
      <span className="eyebrow">بريد عرجون</span>
      <h1>{page.title}</h1>
      {page.needs_review && <div className="notice">نص مبدئي. يعتمد صاحب المنصة النص النهائي من لوحة التحكم.</div>}
      <article>
        {blocks.map((b, i) => {
          const [first, ...rest] = b.split('\n');
          if (first.startsWith('## ')) {
            return (
              <div key={i}>
                <h2>{first.slice(3)}</h2>
                {rest.length > 0 && <p className="preserve-lines">{rest.join('\n')}</p>}
              </div>
            );
          }
          return <p key={i} className="preserve-lines">{b}</p>;
        })}
      </article>
      <p className="subtle-copy">آخر تحديث: {formatDate(page.updated_at)}</p>
      <Link className="text-button" href="/contact">تواصل معنا <ArrowLeft size={17} /></Link>
    </section>
  );
}
