'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublicService } from '@/lib/api/types';

/** Client-side filter over the server-rendered list; every card is already
 * in the HTML so crawlers see all services. */
export function ServicesBrowser({ services, children }: { services: PublicService[]; children: React.ReactNode[] }) {
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => Array.from(new Map(services.map((s) => [s.category.slug, s.category.name]))), [services]);
  const visible = services.map((s) => (!filter || s.category.slug === filter) && (s.name + s.description).includes(query.trim()));
  return (
    <>
      <div className="service-toolbar">
        <div className="filters" role="group" aria-label="تصفية حسب المجال">
          <button className={!filter ? 'active' : ''} aria-pressed={!filter} onClick={() => setFilter('')}>الكل</button>
          {categories.map(([slug, name]) => (
            <button key={slug} className={filter === slug ? 'active' : ''} aria-pressed={filter === slug} onClick={() => setFilter(slug)}>{name}</button>
          ))}
        </div>
        <div className="search-box">
          <Search size={18} />
          <input aria-label="ابحث عن خدمة" placeholder="ابحث عن خدمة..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="services-grid">
        {children.map((child, i) => <div key={services[i].slug} style={{ display: visible[i] ? 'contents' : 'none' }}>{child}</div>)}
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
