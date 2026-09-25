import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { WhatsAppButton } from '@/components/site/WhatsAppButton';
import { JsonLd } from '@/components/site/JsonLd';
import { connection } from 'next/server';
import { getSite, siteUrl } from '@/lib/server-api';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Rendered per request (never at build time, when Django is not running).
  // Data still comes from the tagged Data Cache, so Django is not hit per visit.
  await connection();
  const { settings, pages } = await getSite();
  return (
    <>
      <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>
      <SiteHeader name={settings.name} tagline={settings.tagline} logo={settings.logo_data} nav={settings.navigation || []} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} pages={pages || []} />
      <WhatsAppButton url={settings.whatsapp_url} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Organization', name: settings.name, url: siteUrl(),
        logo: settings.logo_data ? `${siteUrl()}${settings.logo_data.url}` : `${siteUrl()}/brand/arjoon-mark.svg`, description: settings.seo_description,
        ...(settings.email && { email: settings.email }),
        ...(settings.whatsapp_phone && { telephone: settings.whatsapp_phone }),
      }} />
    </>
  );
}
