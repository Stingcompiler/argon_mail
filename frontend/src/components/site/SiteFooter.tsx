import { Leaf } from 'lucide-react';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/api/types';
import { Brand } from './Brand';

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer>
      <div className="container footer-main">
        <div>
          <Brand name={settings.name} tagline={settings.tagline} />
          <p>خدمات متنوعة، وخطوات واضحة.<br />نقرّب لك المسافات، ونهتم بالتفاصيل.</p>
        </div>
        <div>
          <h3>اكتشف عرجون</h3>
          <Link href="/services">خدماتنا</Link>
          <Link href="/about">عن المنصة</Link>
          <Link href="/contact">تواصل معنا</Link>
        </div>
        <div>
          <h3>نرافق خطوتك</h3>
          <Link href="/track">متابعة الطلب</Link>
          <Link href="/admin/login" rel="nofollow">دخول الإدارة</Link>
          <Link href="/privacy">الخصوصية</Link>
          <Link href="/terms">شروط الاستخدام</Link>
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
