import type { Metadata } from 'next';
import { connection } from 'next/server';
import { CategoryCard } from '@/components/site/CategoryCard';
import { ServicesBrowser } from '@/components/site/ServicesBrowser';
import { getCategories, getServices } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'خدماتنا',
  description: 'استكشف مجالات خدمات بريد عرجون الإلكترونية والرقمية، واطلب ما يناسبك وتابع طلبك برقمه.',
  alternates: { canonical: '/services' },
};

type Props = { searchParams: Promise<{ q?: string }> };

/** The main service areas as cards; searching shows matching services as tiles. */
export default async function ServicesPage({ searchParams }: Props) {
  await connection();
  const [categories, services, { q }] = await Promise.all([getCategories(), getServices(), searchParams]);
  return (
    <section className="container page-section services-page">
      <div className="page-intro">
        <span className="eyebrow">خدمات تتسع لاحتياجك</span>
        <h1>خطوتك القادمة تبدأ هنا.</h1>
        <p>اختر المجال، ثم الخدمة التي تحتاجها.</p>
      </div>
      {services.length ? (
        <ServicesBrowser services={services} initialQuery={typeof q === 'string' ? q.slice(0, 80) : ''}>
          <h2 className="sr-only">المجالات</h2>
          <div className="category-grid">
            {categories.map((c) => <CategoryCard key={c.slug} category={c} />)}
          </div>
        </ServicesBrowser>
      ) : (
        <div className="empty-state"><h2>لا توجد خدمات منشورة حاليًا</h2><p>عد قريبًا، أو تواصل معنا لمعرفة المزيد.</p></div>
      )}
    </section>
  );
}
