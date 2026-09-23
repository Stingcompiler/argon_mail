import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ServiceCard } from '@/components/site/ServiceCard';
import { ServicesBrowser } from '@/components/site/ServicesBrowser';
import { getServices } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'خدماتنا',
  description: 'استكشف خدمات بريد عرجون في مجالات متعددة، واطلب ما يناسبك وتابع طلبك بسهولة.',
  alternates: { canonical: '/services' },
};

export default async function ServicesPage() {
  await connection();
  const services = await getServices();
  return (
    <section className="container page-section">
      <div className="page-intro">
        <span className="eyebrow">خدمات تتسع لاحتياجك</span>
        <h1>خطوتك القادمة تبدأ هنا.</h1>
        <p>استكشف ما يناسبك، واترك لنا الاهتمام بالتفاصيل.</p>
      </div>
      {services.length ? (
        <ServicesBrowser services={services}>
          {services.map((s) => <ServiceCard key={s.slug} service={s} cta="تفاصيل الخدمة" />)}
        </ServicesBrowser>
      ) : (
        <div className="empty-state"><h2>لا توجد خدمات منشورة حاليًا</h2><p>عد قريبًا، أو تواصل معنا لمعرفة المزيد.</p></div>
      )}
    </section>
  );
}
