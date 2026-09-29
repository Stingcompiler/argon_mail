import { Check, LayoutGrid, Layers3, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * Default hero artwork: the request journey (choose a service, send details,
 * follow the request code), not any one service type. The service tiles use
 * the icons of the owner's featured services, so the picture stays accurate
 * when categories change. Purely decorative: the hero text says the same.
 */
export function HeroJourney({ icons }: { icons: LucideIcon[] }) {
  const tiles = [...icons, LayoutGrid, Layers3, Sparkles].slice(0, 3);
  return (
    <div className="journey" aria-hidden="true">
      <div className="j-card j-pick">
        <small><b>1</b> اختر الخدمة</small>
        <div className="j-tiles">{tiles.map((Icon, i) => <span key={i} className={i === 0 ? 'on' : ''}><Icon size={22} strokeWidth={1.6} /></span>)}</div>
      </div>
      <div className="j-card j-send">
        <small><b>2</b> أرسل التفاصيل</small>
        <i className="j-line" /><i className="j-line short" />
        <span className="j-chip"><MessageCircle size={14} />WhatsApp</span>
      </div>
      <div className="j-card j-track">
        <small><b>3</b> تابع طلبك</small>
        <div className="j-ticket">
          <span className="j-code" dir="ltr">ARJ-7Q2K9M</span>
          <span className="j-ring"><svg className="j-ring-track" viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="15" /><circle cx="18" cy="18" r="15" className="fill" /></svg><Check size={14} /></span>
        </div>
      </div>
    </div>
  );
}
