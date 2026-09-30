import { Mail, MapPin, MessageCircle, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/site/ContactForm';
import { QueryProvider } from '@/contexts/QueryProvider';
import { getSite } from '@/lib/server-api';

export const metadata: Metadata = { title: 'تواصل معنا', description: 'أرسل سؤالك أو استفسارك إلى فريق بريد عرجون وسنتواصل معك عبر WhatsApp.', alternates: { canonical: '/contact' } };

export default async function ContactPage() {
  const { settings } = await getSite();
  return (
    <section className="container page-section">
      <div className="page-intro">
        <span className="eyebrow">نسمعك باهتمام</span>
        <h1>كل سؤال، بداية تواصل.</h1>
        <p>أخبرنا كيف نساعدك.</p>
      </div>
      <div className="contact-layout">
        <QueryProvider><ContactForm /></QueryProvider>
        {/* Other ways to reach the team; each line only when it is configured. */}
        <aside className="contact-card" aria-labelledby="contact-other">
          <h2 id="contact-other">طرق أخرى للتواصل</h2>
          {settings.whatsapp_url && (
            <a className="contact-line" href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <span className="contact-icon"><MessageCircle size={19} /></span><span><b>WhatsApp</b><small>محادثة مباشرة مع الفريق</small></span>
            </a>
          )}
          {settings.email && (
            <a className="contact-line" href={`mailto:${settings.email}`}>
              <span className="contact-icon"><Mail size={19} /></span><span><b>البريد الإلكتروني</b><small dir="ltr">{settings.email}</small></span>
            </a>
          )}
          {settings.address && (
            <div className="contact-line">
              <span className="contact-icon"><MapPin size={19} /></span><span><b>العنوان</b><small>{settings.address}</small></span>
            </div>
          )}
          <Link className="contact-line" href="/track">
            <span className="contact-icon"><Package size={19} /></span><span><b>لديك طلب؟</b><small>تابع حالته برقم الطلب أو باسمك</small></span>
          </Link>
          <p className="subtle-copy">نرد على رسالتك عبر WhatsApp على الرقم الذي تكتبه في النموذج.</p>
        </aside>
      </div>
    </section>
  );
}
