import { ArrowUpLeft, CheckCheck, Clock3, Layers3, MessageCircle, Package, Send, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { FaqList } from '@/components/site/FaqList';
import { JsonLd } from '@/components/site/JsonLd';
import { HeroJourney } from '@/components/site/HeroJourney';
import { ServiceCard } from '@/components/site/ServiceCard';
import { iconFor } from '@/components/icons';
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
  const sections = settings.home_sections?.length ? settings.home_sections : [{ key: 'services', visible: true }, { key: 'how', visible: true }, { key: 'faq', visible: true }];
  // Owner-controlled order and visibility (the hero always comes first). Orders
  // step by 10 so the tracking band can sit right after «how it works» (5).
  const place = (key: string) => {
    const i = sections.findIndex((x) => x.key === key);
    return { order: i < 0 ? 990 : i * 10, display: i >= 0 && !sections[i].visible ? 'none' : undefined } as const;
  };
  return (
    <div className="home-layout">
      <section className="hero container" style={{ order: -2 }}>
        <div className="hero-copy">
          <span className="eyebrow"><span />{settings.hero_eyebrow}</span>
          <h1 className="preserve-lines">{settings.hero_title}</h1>
          <p className="preserve-lines">{settings.hero_text}</p>
          <div className="hero-actions">
            {/* New visitors start by choosing a service; existing customers track. */}
            <Link className="button" href="/services">استعرض الخدمات <ArrowUpLeft size={19} /></Link>
            <Link className="button secondary" href="/track"><Package size={18} />تابع طلبك</Link>
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
          {!settings.hero_image_data && <HeroJourney icons={featured.slice(0, 3).map((x) => iconFor(x.icon_key))} />}
        </div>
      </section>
      {/* After «how it works», whose last step introduces the request code. Tracking
          also stays one tap away in the header, the hero and the phone tab bar. */}
      <section className="container tracking-strip" aria-labelledby="track-heading" style={{ order: place('how').order + 5 }}>
        <div className="tracking-label">
          <span className="tracking-icon"><Package size={24} /></span>
          <div><h2 id="track-heading">لديك رقم طلب؟</h2><p>تابع حالته في أي وقت.</p></div>
        </div>
        <TrackForm />
      </section>
      {featured.length > 0 && (
        <section className="container services-section" style={place('services')}>
          <div className="section-heading">
            <div><span className="eyebrow">مساحات متعددة، عناية واحدة</span><h2>كيف نقدر نساعدك؟</h2></div>
            <Link className="text-button" href="/services">جميع الخدمات <ArrowUpLeft size={18} /></Link>
          </div>
          <div className="services-grid">{featured.map((s) => <ServiceCard key={s.slug} service={s} />)}</div>
        </section>
      )}
      <section className="how-section" id="how" style={place('how')}>
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
                <span className="step-number" aria-hidden="true">{s.n}</span><s.icon size={25} strokeWidth={1.4} /><h3>{s.title}</h3><p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {faq.length > 0 && (
        <section className="container faq-section" style={place('faq')}>
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
