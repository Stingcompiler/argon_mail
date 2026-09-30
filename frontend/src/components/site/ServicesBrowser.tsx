'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublicService } from '@/lib/api/types';
import { SlidingGroup } from '@/lib/motion';

/** Client-side filter over the server-rendered list; every card is already
 * in the HTML so crawlers see all services. */
export function ServicesBrowser({ services, children }: { services: PublicService[]; children: React.ReactNode[] }) {
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => Array.from(new Map(services.map((s) => [s.category.slug, s.category.name]))), [services]);
  const visible = services.map((s) => (!filter || s.category.slug === filter) && (s.name + s.description).includes(query.trim()));
  // Position among the visible cards, for the stagger delay.
  let n = 0;
  const order = visible.map((v) => (v ? n++ : 0));
  // Only animate after the visitor filters, never on first paint.
  const [touched, setTouched] = useState(false);
  return (
    <>
      <div className="service-toolbar">
        <SlidingGroup active={filter} className="filters" role="group" aria-label="تصفية حسب المجال">
          <button className={!filter ? 'active' : ''} aria-pressed={!filter} onClick={() => { setTouched(true); setFilter(''); }}>الكل</button>
          {categories.map(([slug, name]) => (
            <button key={slug} className={filter === slug ? 'active' : ''} aria-pressed={filter === slug} onClick={() => { setTouched(true); setFilter(slug); }}>{name}</button>
          ))}
        </SlidingGroup>
        <div className="search-box">
          <Search size={18} />
          <input aria-label="ابحث عن خدمة" placeholder="ابحث عن خدمة..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {/* A new category re-mounts the grid so the matching cards fade in one after another (CSS). */}
      <div className={'services-grid' + (touched ? ' stagger' : '')} key={touched ? filter || 'all' : undefined}>
        {children.map((child, i) => (
          <div key={services[i].slug} style={{ display: visible[i] ? 'contents' : 'none', ['--i' as string]: order[i] }}>{child}</div>
        ))}
      </div>
      {!visible.some(Boolean) && (
        <div className="empty-state">
          <Search size={35} />
          <h2>لم نجد خدمة بهذا الاسم</h2>
          <p>جرّب كلمة أخرى أو اختر جميع المجالات.</p>
        </div>
      )}
    </>
  );
}
