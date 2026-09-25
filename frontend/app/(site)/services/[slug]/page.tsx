import { ArrowRight, Clock3, FileText, MessageCircle, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import { iconFor } from '@/components/icons';
import { JsonLd } from '@/components/site/JsonLd';
import { OrderForm } from '@/components/site/OrderForm';
import { PreviewBanner } from '@/components/site/PreviewBanner';
import { getService, getServiceRedirect, getSite, ogBase, siteUrl } from '@/lib/server-api';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(params: Props['params'], searchParams: Props['searchParams']) {
  await connection();
  const preview = (await searchParams).preview;
  let slug: string;
  try {
    slug = decodeURIComponent((await params).slug);
  } catch {
    notFound(); // malformed percent-encoding
  }
  const service = await getService(slug, preview);
  if (service) return { ...service, preview: !!preview };
  const moved = await getServiceRedirect(slug);
  if (moved) permanentRedirect(`/services/${encodeURIComponent(moved.slug)}`);
  notFound();
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const s = await load(params, searchParams);
  const title = s.seo_title || s.name;
  const description = s.seo_description || s.description.slice(0, 160);
  const url = `/services/${encodeURIComponent(s.slug)}`;
  return {
    title, description, alternates: { canonical: url }, openGraph: { ...ogBase, title, description, url },
    ...(s.preview && { robots: { index: false, follow: false } }),
  };
}

export default async function ServicePage({ params, searchParams }: Props) {
  const [s, { settings }] = await Promise.all([load(params, searchParams), getSite()]);
  const Icon = iconFor(s.icon_key);
  const url = `${siteUrl()}/services/${encodeURIComponent(s.slug)}`;
  return (
    <section className="container page-section">
      {s.preview && <PreviewBanner />}
      <nav aria-label="مسار التنقل">
        <Link className="back-link" href="/services"><ArrowRight size={17} />العودة إلى الخدمات</Link>
      </nav>
      <div className="detail-layout">
        <aside className="detail-info">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.image ? <img className="detail-image" src={s.image.url} alt={s.image.alt} width={s.image.width} height={s.image.height} fetchPriority="high" />
            : <span className={`detail-icon ${s.color}`}><Icon size={42} strokeWidth={1.3} /></span>}
          <span className="eyebrow">{s.category.name}</span>
          <h1>{s.name}</h1>
          <p className="preserve-lines">{s.description}</p>
          <div className="detail-meta">
            <span><Clock3 size={18} />{s.duration_text || 'المدة تُحدد بعد مراجعة الطلب'}</span>
            <span><FileText size={18} />{s.price_label}</span>
            <span><MessageCircle size={18} />التواصل عبر WhatsApp</span>
          </div>
          {s.requirements && (
            <div className="detail-requirements"><h2>المتطلبات</h2><p className="preserve-lines">{s.requirements}</p></div>
          )}
          <div className="help-card">
            <ShieldCheck size={23} />
            <h3>بياناتك في مكانها الصحيح</h3>
            <p>يطّلع فريق العمل المصرّح له فقط على تفاصيل طلبك، ولا تظهر في صفحة المتابعة.</p>
          </div>
        </aside>
        <OrderForm service={s} limits={{ maxFileMb: settings.max_file_mb, maxFiles: settings.max_files_per_order, maxTotalMb: settings.max_order_upload_mb ?? 20 }} />
      </div>
      <JsonLd data={[
        {
          '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.description, url,
          ...(s.image && { image: `${siteUrl()}${s.image.url}` }),
          serviceType: s.category.name, areaServed: 'SD',
          provider: { '@type': 'Organization', name: settings.name, url: siteUrl() },
          ...(s.price_type !== 'after_review' && s.price_amount && {
            offers: { '@type': 'Offer', price: s.price_amount, priceCurrency: s.price_currency },
          }),
        },
        {
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl() },
            { '@type': 'ListItem', position: 2, name: 'خدماتنا', item: `${siteUrl()}/services` },
            { '@type': 'ListItem', position: 3, name: s.name, item: url },
          ],
        },
      ]} />
    </section>
  );
}
