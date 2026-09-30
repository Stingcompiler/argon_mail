import { Package, Search } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { TabBar } from '@/components/site/MobileNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { getSite } from '@/lib/server-api';

export const metadata = { title: 'الصفحة غير موجودة', robots: { index: false } };

function Body() {
  return (
    <main id="main" className="container centered-page">
      <Search size={40} />
      <h1>لم نجد هذه الصفحة.</h1>
      <p>ربما تغيّر الرابط أو لم تعد الخدمة متاحة.</p>
      <Link className="button" href="/services">تصفح الخدمات</Link>
      <Link className="text-button" href="/track"><Package size={17} /> تابع طلبك</Link>
      <Link className="back-link" href="/">العودة إلى الرئيسية</Link>
    </main>
  );
}

/** Unknown URLs keep the site's header, footer and phone tab bar, so the
 * visitor never loses the way back. Falls back to the bare page if the site
 * settings can't be loaded. */
export default async function NotFound() {
  // Per request, like the site layout: at build time Django isn't running, so a
  // prerendered 404 would bake in the bare fallback.
  await connection();
  let site: Awaited<ReturnType<typeof getSite>> | null = null;
  try { site = await getSite(); } catch { /* bare page below */ }
  if (!site) return <Body />;
  const { settings, pages } = site;
  return (
    <>
      <SiteHeader name={settings.name} tagline={settings.tagline} logo={settings.logo_data} nav={settings.navigation || []} whatsapp={settings.whatsapp_url} />
      <Body />
      <SiteFooter settings={settings} pages={pages || []} />
      <TabBar />
    </>
  );
}
