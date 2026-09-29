import { ArrowUpLeft, Bell, CheckCheck, Clock3, Layers3, MessageCircle, Package, Send, ShieldCheck, UserCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { FaqList } from '@/components/site/FaqList';
import { JsonLd } from '@/components/site/JsonLd';
import { CarouselDots } from '@/components/site/CarouselDots';
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
          <div className="hero-actions" data-area="hero">
            {/* New visitors start by choosing a service; existing customers track. */}
            <Link className="button" href="/services">استعرض الخدمات <ArrowUpLeft size={19} /></Link>
            <Link className="button secondary" href="/track"><Package size={18} />تابع طلبك</Link>
          </div>
          {/* Facts the product guarantees, not general reassurance (landing plan, phase 3). */}
          <ul className="hero-trust">
            <li><UserCheck size={16} />دون حساب أو كلمة مرور</li>
            <li><ShieldCheck size={16} /><Link href="/privacy">تفاصيلك للفريق فقط، لا لصفحة المتابعة</Link></li>
            <li><Clock3 size={16} />السعر موضح في كل خدمة، أو يُحدد بعد المراجعة</li>
          </ul>
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
        <section className="container services-section" data-area="featured" style={place('services')}>
          <div className="section-heading">
            <div><span className="eyebrow">مساحات متعددة، عناية واحدة</span><h2>كيف نقدر نساعدك؟</h2></div>
            <Link className="text-button" href="/services">جميع الخدمات <ArrowUpLeft size={18} /></Link>
          </div>
          <div className="services-grid">{featured.map((s) => <ServiceCard key={s.slug} service={s} />)}</div>
          <CarouselDots count={featured.length} target=".services-section .services-grid" />
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
              { n: '01', title: 'اختر ما تحتاجه', text: 'في صفحة كل خدمة تفاصيلها ومتطلباتها وطريقة تسعيرها.', icon: Layers3 },
              { n: '02', title: 'أرسل طلبك', text: 'املأ النموذج واكتب رقمك في WhatsApp، فيظهر لك رقم طلب يبدأ بـ ARJ-.', icon: Send },
              { n: '03', title: 'تابع حتى الإنجاز', text: 'تابع الحالة برقم الطلب، أو باسمك ورقم هاتفك إن نسيته.', icon: CheckCheck },
            ].map((s) => (
              <div className="step" key={s.n}>
                <span className="step-number" aria-hidden="true">{s.n}</span><s.icon size={25} strokeWidth={1.4} /><h3>{s.title}</h3><p>{s.text}</p>
              </div>
            ))}
          </div>
          {/* What really happens next, in place of testimonials or ratings we don't have. */}
          <div className="after-submit">
            <h3>بعد إرسال طلبك</h3>
            <ul>
              <li><Bell size={18} /><span>يصل تنبيه إلى فريق عرجون، ويُراجَع طلبك في لوحة العمل.</span></li>
              <li><MessageCircle size={18} /><span>إن احتاج الطلب تفاصيل أو تأكيد سعر، يتواصل معك المسؤول عبر WhatsApp.</span></li>
              <li><Package size={18} /><span>كل تغيير في الحالة يظهر في صفحة المتابعة، مع ملاحظات الفريق العامة.</span></li>
              <li><ShieldCheck size={18} /><span>لا نطلب بريدك الإلكتروني ولا نراسلك به؛ التواصل عبر WhatsApp وصفحة المتابعة.</span></li>
            </ul>
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
      {/* Closing action (landing plan, phase 4): a clear next step at the bottom.
          WhatsApp only when the platform number is set; otherwise the contact page. */}
      <section className="container closing-cta" data-area="closing" aria-labelledby="closing-title" style={{ order: 995 }}>
        <div>
          <h2 id="closing-title">جاهز لخطوتك التالية؟</h2>
          <p>اختر الخدمة المناسبة وأرسل طلبك في دقائق، أو اسألنا قبل أن تبدأ.</p>
        </div>
        <div className="closing-actions">
          <Link className="button" href="/services">استعرض الخدمات <ArrowUpLeft size={19} /></Link>
          {settings.whatsapp_url
            ? <a className="button secondary" href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />تحدث معنا عبر WhatsApp</a>
            : <Link className="button secondary" href="/contact"><MessageCircle size={18} />تواصل معنا</Link>}
        </div>
      </section>
    </div>
  );
}
