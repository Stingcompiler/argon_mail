import { Layers3, MessageCircle, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getSite } from '@/lib/server-api';

export const metadata: Metadata = { title: 'عن المنصة', description: 'تعرّف على بريد عرجون: خدمات متنوعة في تجربة بسيطة وخطوات واضحة.', alternates: { canonical: '/about' } };

export default async function AboutPage() {
  await connection();
  const { settings } = await getSite();
  return (
    <section className="container page-section">
      <div className="page-intro">
        <span className="eyebrow">عن {settings.name}</span>
        <h1>قريبون، مهما كانت المسافة.</h1>
        <p className="preserve-lines">{settings.about}</p>
      </div>
      <div className="about-grid">
        {[
          { icon: Layers3, title: 'خدمات تتجدد', text: 'تُضاف المجالات والخدمات بحسب ما يقدمه فريق عرجون، لتجد الخيارات المنشورة في مكان واحد.' },
          { icon: MessageCircle, title: 'تواصل إنساني', text: 'أرسل طلبك واترك رقم WhatsApp، ليتواصل معك المسؤول عند الحاجة.' },
          { icon: ShieldCheck, title: 'خطوات واضحة', text: 'رقم طلب تحتفظ به، وحالة تعرفها، وملاحظات تتابع من خلالها تقدم العمل.' },
        ].map((a) => <div className="about-card" key={a.title}><a.icon size={30} /><h2>{a.title}</h2><p>{a.text}</p></div>)}
      </div>
    </section>
  );
}
