'use client';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { PublicService } from '@/lib/api/types';
import { ServiceTile } from './ServiceTile';

/**
 * Search across every service. With no query the server-rendered category
 * cards show (crawlers see them, and each area page lists its services);
 * a query shows the matching services as tiles.
 */
export function ServicesBrowser({ services, initialQuery = '', children }: { services: PublicService[]; initialQuery?: string; children: React.ReactNode }) {
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim();
  const found = q ? services.filter((s) => (s.name + ' ' + s.description + ' ' + s.category.name).includes(q)) : [];
  return (
    <>
      <div className="search-box services-search" role="search">
        <Search size={18} />
        <input type="search" aria-label="ابحث عن خدمة" placeholder="ابحث عن الخدمة التي تحتاجها..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!q ? children : (
        <section aria-live="polite" aria-label="نتائج البحث">
          {found.length ? (
            <>
              <h2 className="tiles-heading">{found.length === 1 ? 'خدمة واحدة' : `${found.length} خدمات`} تطابق «{q}»</h2>
              <div className="service-tiles">{found.map((s) => <ServiceTile key={s.slug} service={s} />)}</div>
            </>
          ) : (
            <div className="empty-state">
              <Search size={35} strokeWidth={1.5} />
              <h2>لم نجد خدمة بهذا الاسم</h2>
              <p>جرّب كلمة أخرى، أو تصفح المجالات.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
