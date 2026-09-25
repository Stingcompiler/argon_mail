import { Leaf } from 'lucide-react';
import Link from 'next/link';
import type { PageLink, SiteSettings } from '@/lib/api/types';
import { Brand } from './Brand';

export function SiteFooter({ settings, pages }: { settings: SiteSettings; pages: PageLink[] }) {
  return (
    <footer>
      <div className="container footer-main">
        <div>
          <Brand name={settings.name} tagline={settings.tagline} logo={settings.logo_data} />
          <p>خدمات متنوعة، وخطوات واضحة.<br />نقرّب لك المسافات، ونهتم بالتفاصيل.</p>
        </div>
        <div>
          <h2>اكتشف عرجون</h2>
          <Link href="/services">خدماتنا</Link>
          <Link href="/about">عن المنصة</Link>
          <Link href="/contact">تواصل معنا</Link>
        </div>
        <div>
          <h2>نرافق خطوتك</h2>
          <Link href="/track">متابعة الطلب</Link>
          <Link href="/admin/login" rel="nofollow">دخول الإدارة</Link>
          {pages.map((p) => (
            <Link key={p.slug} href={p.slug === 'privacy' || p.slug === 'terms' ? `/${p.slug}` : `/p/${encodeURIComponent(p.slug)}`}>{p.title}</Link>
          ))}
          <span className="footer-note">{settings.address || 'من السودان، بكل عناية.'}</span>
        </div>
        <div className="footer-message">
          <Leaf size={27} />
          <p>لكل طلب وجهة.<br /><b>ولكل تفصيل عناية.</b></p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {settings.name}</span>
        {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
      </div>
    </footer>
  );
}
