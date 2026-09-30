import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { QueryProvider } from '@/contexts/QueryProvider';
import { CategoryCard } from '@/components/site/CategoryCard';
import { OrderDialog } from '@/components/site/OrderDialog';
import { ServicesBrowser } from '@/components/site/ServicesBrowser';
import { getCategories, getServices, getSite } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'الخدمات',
  description: 'استكشف مجالات خدمات بريد عرجون الإلكترونية والرقمية، واطلب ما يناسبك وتابع طلبك برقمه.',
  alternates: { canonical: '/services' },
};

type Props = { searchParams: Promise<{ q?: string }> };

/** The main service areas as cards; searching shows matching services as tiles. */
export default async function ServicesPage({ searchParams }: Props) {
  await connection();
  const [categories, services, { settings }, { q }] = await Promise.all([getCategories(), getServices(), getSite(), searchParams]);
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
      <QueryProvider><Suspense><OrderDialog services={services} limits={{ maxFileMb: settings.max_file_mb, maxFiles: settings.max_files_per_order, maxTotalMb: settings.max_order_upload_mb ?? 20 }} /></Suspense></QueryProvider>
    </section>
  );
}
