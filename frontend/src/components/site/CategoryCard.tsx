import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PublicCategory } from '@/lib/api/types';
import { iconFor } from '../icons';

export const categoryHref = (slug: string) => `/services/category/${encodeURIComponent(slug)}`;

const countLabel = (n: number) => (n === 1 ? 'خدمة واحدة' : n === 2 ? 'خدمتان' : `${n} خدمات`);

/**
 * The large card of a service area (docs/brand-readjust-plan.md): the service
 * card as it was, with the area's image as the background of its top part
 * (or its tint, rings and icon), the short description there, then a larger
 * centred title, the long description and «استعرض الخدمات». The title's
 * link covers the whole card; the top part repeats it for pointers only.
 */
export function CategoryCard({ category: c, headingLevel = 3 }: { category: PublicCategory; headingLevel?: 2 | 3 }) {
  const Icon = iconFor(c.icon_key);
  const href = categoryHref(c.slug || '-');
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <article className="service-card category-card">
      <Link className={`service-art ${c.color}`} href={href} tabIndex={-1} aria-hidden="true">
        <div className="art-ring" />
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
