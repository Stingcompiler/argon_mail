import { ArrowLeft, ArrowUpLeft, Check, CheckCheck, CheckCircle2, Clock3, Layers3, Leaf, MessageCircle, Package, Send, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { FaqList } from '@/components/site/FaqList';
import { JsonLd } from '@/components/site/JsonLd';
import { ServiceCard } from '@/components/site/ServiceCard';
import { TrackForm } from '@/components/site/TrackForm';
import { getServices, getSite } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { settings } = await getSite();
  return { title: { absolute: settings.seo_title }, description: settings.seo_description, alternates: { canonical: '/' } };
}

export default async function Home() {
  await connection(); // rendered per request; data comes from the tagged cache
  const [{ settings, faq }, services] = await Promise.all([getSite(), getServices()]);
  const featured = services.filter((s) => s.is_featured);
  return (
    <div className="home-layout">
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow"><span />{settings.hero_eyebrow}</span>
          <h1 className="preserve-lines">{settings.hero_title}</h1>
          <p className="preserve-lines">{settings.hero_text}</p>
          <div className="hero-actions">
            <Link className="button" href="/services">اكتشف خدماتنا <ArrowUpLeft size={19} /></Link>
            <a className="text-button" href="#how">كيف تعمل عرجون؟ <ArrowLeft size={17} /></a>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={16} />خصوصية لبياناتك</span><i />
            <span><MessageCircle size={16} />تواصل مباشر</span><i />
            <span><Clock3 size={16} />متابعة واضحة</span>
          </div>
        </div>
        <div className={'hero-visual' + (settings.hero_image_data ? ' has-image' : '')} aria-hidden={settings.hero_image_data ? undefined : true}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings.hero_image_data && <img className="custom-hero-image" src={settings.hero_image_data.url} alt={settings.hero_image_data.alt} width={settings.hero_image_data.width} height={settings.hero_image_data.height} fetchPriority="high" />}
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <span className="visual-top">من أول خطوة، إلى تمام الإنجاز.</span>
          <div className="visual-spark"><Sparkles size={24} /></div>
          <div className="mail-illustration">
            <div className="letter">
              <div className="letter-head"><Leaf size={21} /><span>{settings.name}</span></div>
              <div className="letter-line long" /><div className="letter-line" />
              <div className="letter-stamp"><Check size={21} /></div>
            </div>
            <div className="envelope"><div className="envelope-flap" /><div className="envelope-front" /><div className="seal"><Leaf size={29} /></div></div>
          </div>
          <div className="floating-chip chip-one">
            <span className="mini-icon"><Package size={20} /></span>
            <div><b>طلبك في أيدٍ أمينة</b><small>تفاصيل واضحة، في كل خطوة</small></div>
            <CheckCircle2 size={16} />
          </div>
          <div className="floating-chip chip-two"><span className="mini-icon gold"><CheckCheck size={19} /></span><b>خطوة أقرب إلى إنجازك</b></div>
          <div className="visual-bottom"><span>ARJOON POST</span><span>نهتم بالتفاصيل الصغيرة <ArrowUpLeft size={13} /></span></div>
        </div>
      </section>
      <section className="container tracking-strip" aria-labelledby="track-heading">
        <div className="tracking-label">
          <span className="tracking-icon"><Package size={27} /></span>
          <div><h2 id="track-heading">طلبك، أين وصل؟</h2><p>رقم واحد يبقيك على اطلاع.</p></div>
        </div>
        <TrackForm />
      </section>
      {featured.length > 0 && (
        <section className="container services-section">
          <div className="section-heading">
            <div><span className="eyebrow">مساحات متعددة، عناية واحدة</span><h2>كيف نقدر نساعدك؟</h2></div>
            <Link className="text-button" href="/services">جميع الخدمات <ArrowUpLeft size={18} /></Link>
          </div>
          <div className="services-grid">{featured.map((s) => <ServiceCard key={s.slug} service={s} />)}</div>
        </section>
      )}
      <section className="how-section" id="how">
        <div className="container how-inner">
          <div>
            <span className="eyebrow">ببساطة، من البداية للنهاية</span>
            <h2>ثلاث خطوات.<br />وتبدأ الحكاية.</h2>
            <p>صممنا التجربة لتكون واضحة،<br />وتترك لك وقتًا لما يهمك.</p>
          </div>
          <div className="steps">
            {[
              { n: '01', title: 'اختر ما تحتاجه', text: 'تصفح الخدمات واطلع على تفاصيلها ومتطلباتها.', icon: Layers3 },
              { n: '02', title: 'أرسل طلبك', text: 'أضف بياناتك ورقم WhatsApp للتواصل معك.', icon: Send },
              { n: '03', title: 'تابع حتى الإنجاز', text: 'احتفظ برقم طلبك واعرف كل جديد في أي وقت.', icon: CheckCheck },
            ].map((s) => (
              <div className="step" key={s.n}>
                <span className="step-number">{s.n}</span><s.icon size={25} strokeWidth={1.4} /><h3>{s.title}</h3><p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {faq.length > 0 && (
        <section className="container faq-section">
          <div>
            <span className="eyebrow">قبل أن تبدأ</span>
            <h2>أسئلة في بالك؟</h2>
            <p>إجابات قصيرة، لصورة أوضح.</p>
            <Link className="text-button" href="/contact">تواصل معنا <ArrowUpLeft size={17} /></Link>
          </div>
          <FaqList items={faq} />
          <JsonLd data={{
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
          }} />
        </section>
      )}
    </div>
  );
}
