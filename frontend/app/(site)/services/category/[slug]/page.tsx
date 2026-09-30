import { ArrowRight, PackageSearch } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { categoryHref } from '@/components/site/CategoryCard';
import { ServiceTile } from '@/components/site/ServiceTile';
import { ogBase, getCategory, getServices } from '@/lib/server-api';
import { iconFor } from '@/components/icons';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const slug = decodeURIComponent((await params).slug);
  const c = await getCategory(slug);
  if (!c) return { title: 'المجال غير موجود' };
  const description = c.description || `خدمات ${c.name} من بريد عرجون: اختر الخدمة وأرسل طلبك وتابعه برقم الطلب.`;
  return {
    title: c.name, description,
    alternates: { canonical: categoryHref(c.slug) },
    openGraph: { ...ogBase, title: c.name, description, url: categoryHref(c.slug) },
  };
}

/** A main service area: its services as tiles (icon and name). */
export default async function CategoryPage({ params }: Props) {
  await connection();
  const slug = decodeURIComponent((await params).slug);
  const [category, services] = await Promise.all([getCategory(slug), getServices()]);
  if (!category) notFound();
  const inside = services.filter((s) => s.category.slug === category.slug);
  const Icon = iconFor(category.icon_key);
  return (
    <section className="container page-section category-page">
      <Link className="back-link" href="/services"><ArrowRight size={18} />كل المجالات</Link>
      <header className="category-hero">
        {category.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="category-hero-image" src={category.image.url} alt={category.image.alt} width={category.image.width} height={category.image.height} />
          : <span className="category-hero-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.5} /></span>}
        <div>
          <h1>{category.name}</h1>
          {category.description && <p>{category.description}</p>}
        </div>
      </header>
      <h2 className="tiles-heading">اختر الخدمة</h2>
      <div className="service-tiles">
        {inside.map((s) => <ServiceTile key={s.slug} service={s} />)}
        <Link className="service-tile tile-track" href="/track">
          <span className="tile-icon" aria-hidden="true"><PackageSearch size={26} strokeWidth={1.5} /></span>
          <span className="tile-name">تتبع طلبك</span>
        </Link>
      </div>
    </section>
  );
}
