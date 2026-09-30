import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PublicCategory } from '@/lib/api/types';
import { iconFor } from '../icons';

export const categoryHref = (slug: string) => `/services/category/${encodeURIComponent(slug)}`;

const countLabel = (n: number) => (n === 1 ? 'خدمة واحدة' : n === 2 ? 'خدمتان' : `${n} خدمات`);

/**
 * The plate behind an area's icon when no image is uploaded: a postage stamp,
 * its perforation drawn as dots in the tint colour along a white edge
 * (docs/landing-mobile-audit-plan.md, batch 2). Decorative.
 */
function ArtStamp() {
  return (
    <svg className="art-stamp" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <rect x="5" y="5" width="86" height="86" rx="7" fill="var(--white)" />
      <rect x="5" y="5" width="86" height="86" rx="7" fill="none" stroke="var(--art-bg)" strokeWidth="6" strokeDasharray="0 10.75" strokeLinecap="round" />
      <rect x="14" y="14" width="68" height="68" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".35" />
    </svg>
  );
}

/**
 * The large card of a service area (docs/brand-readjust-plan.md): the service
 * card as it was, with the area's image as the background of its top part
 * (or its tint and icon on a stamp), the short description there, then a larger
 * centred title, the long description and «استعرض الخدمات». The title's
 * link covers the whole card; the top part repeats it for pointers only.
 * Inside a `.compact-cards` container narrower than 720px (the phone home)
 * the same card renders compact: stamp, title, count, two lines of description.
 */
export function CategoryCard({ category: c, headingLevel = 3 }: { category: PublicCategory; headingLevel?: 2 | 3 }) {
  const Icon = iconFor(c.icon_key);
  const href = categoryHref(c.slug || '-');
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <article className="service-card category-card">
      <Link className={`service-art ${c.color}`} href={href} tabIndex={-1} aria-hidden="true">
        {!c.image && <ArtStamp />}
        <Icon size={46} strokeWidth={1.5} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.image && <img className="service-custom-image" src={c.image.url} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />}
        {c.tagline && <span>{c.tagline}</span>}
        <ArrowLeft className="art-arrow" size={18} />
      </Link>
      <div className="service-body">
        <small>{countLabel(c.services_count)}</small>
        <Heading><Link href={href}>{c.name}</Link></Heading>
        {c.description && <p>{c.description}</p>}
        <Link className="text-button" href={href}>استعرض الخدمات <ArrowLeft size={17} /></Link>
      </div>
    </article>
  );
}
