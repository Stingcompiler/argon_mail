import type { Metadata } from 'next';
import { ContactForm } from '@/components/site/ContactForm';

export const metadata: Metadata = { title: 'تواصل معنا', description: 'أرسل سؤالك أو استفسارك إلى فريق بريد عرجون وسنتواصل معك عبر WhatsApp.', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return (
    <section className="container page-section">
      <div className="page-intro">
        <span className="eyebrow">نسمعك باهتمام</span>
        <h1>كل سؤال، بداية تواصل.</h1>
        <p>أخبرنا كيف نقدر نساعدك.</p>
      </div>
      <ContactForm />
    </section>
  );
}
