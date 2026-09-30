import Link from 'next/link';
import type { PublicCategory } from '@/lib/api/types';
import { iconFor } from '../icons';

export const categoryHref = (slug: string) => `/services/category/${encodeURIComponent(slug)}`;

/**
 * A main service area as a card: an image on top (or the area's icon on a sky
 * gradient when there is none), then a large centred title. The whole card is
 * one link to the area's page, where its services are tiles.
 */
export function CategoryCard({ category: c, headingLevel = 3 }: { category: PublicCategory; headingLevel?: 2 | 3 }) {
  const Icon = iconFor(c.icon_key);
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <Link className="category-card" href={categoryHref(c.slug)}>
      <span className="category-card-media" aria-hidden="true">
        {c.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.image.url} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />
          : <span className="category-card-icon"><Icon size={40} strokeWidth={1.5} /></span>}
      </span>
      <span className="category-card-body">
        <Heading>{c.name}</Heading>
        {c.description && <span className="category-card-line">{c.description}</span>}
        <span className="category-card-count">{c.services_count === 1 ? 'خدمة واحدة' : c.services_count === 2 ? 'خدمتان' : `${c.services_count} خدمات`}</span>
      </span>
    </Link>
  );
}
