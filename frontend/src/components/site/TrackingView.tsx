'use client';
import { Check, Clock3, LoaderCircle, MessageSquareText, RotateCw, Search, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTracking } from '@/hooks/public';
import { ApiError } from '@/lib/api/client';
import { formatDate, formatDateTime, statusTone } from '@/lib/format';
import { NameLookup } from './NameLookup';
import { RememberCode } from './RememberCode';
import { TrackForm } from './TrackForm';

export function TrackingView() {
  const code = (useSearchParams().get('code') || '').trim().toUpperCase();
  const q = useTracking(code);
  const t = q.data;
  const [mode, setMode] = useState<'code' | 'name'>('code');
  const tabs = (
    <div className="segmented track-modes" role="group" aria-label="طريقة المتابعة">
      <button type="button" className={mode === 'code' ? 'selected' : ''} aria-pressed={mode === 'code'} onClick={() => setMode('code')}>برقم الطلب</button>
      <button type="button" className={mode === 'name' ? 'selected' : ''} aria-pressed={mode === 'name'} onClick={() => setMode('name')}>بالاسم ورقم الهاتف</button>
    </div>
  );
  if (mode === 'name') return <>{tabs}<NameLookup /></>;
  return (
    <>
      {tabs}
      <TrackForm initial={code} key={code} />
      {q.isLoading && <div className="empty-state" role="status"><LoaderCircle className="spin" size={30} /><p>جارٍ البحث عن طلبك...</p></div>}
      {q.isError && (q.error instanceof ApiError && q.error.status === 404 ? (
        <div className="empty-state" role="alert">
          <Search size={35} />
          <h2>لم نعثر على هذا الطلب</h2>
          <p>تحقق من رقم المتابعة وأعد المحاولة. يبدأ الرقم بـ ARJ-.</p>
          <button className="text-button" onClick={() => setMode('name')}>نسيت الرقم؟ تابع باسمك ورقم هاتفك</button>
        </div>
      ) : (
        <div className="empty-state" role="alert">
          <h2>تعذّر عرض حالة الطلب</h2>
          <p>{q.error.message}</p>
          <button className="button secondary" onClick={() => q.refetch()}><RotateCw size={16} /> إعادة المحاولة</button>
        </div>
      ))}
      {t && (
        <div className="tracking-result">
          <div className="result-heading">
            <div>
              <small>طلب خدمة</small>
              <h2>{t.service_name}</h2>
              <span className="order-id" dir="ltr">{t.code}</span>
            </div>
            <span className={`badge ${statusTone(t.status.meaning)}`}><i />{t.status.label}</span>
          </div>
          <p className="subtle-copy">آخر تحديث: {formatDateTime(t.updated_at)}</p>
          <div className="timeline">
            {t.timeline.map((item, i) => {
              const last = i === t.timeline.length - 1;
              return (
                <div key={i}>
                  <span className={'timeline-dot' + (last ? ' current' : '')}>
                    {item.kind === 'note' ? <MessageSquareText size={14} /> : last ? <Clock3 size={14} /> : <Check size={14} />}
                  </span>
                  <b>{item.title}</b>
                  <small>{item.kind === 'created' ? formatDate(item.at) : formatDateTime(item.at)}</small>
                  {item.text && <p>{item.text}</p>}
                  {item.kind === 'created' && <p>سُجّل طلبك وأصبح جاهزًا للمراجعة.</p>}
                </div>
              );
            })}
          </div>
          <RememberCode compact />
          <div className="tracking-foot"><ShieldCheck size={17} />لخصوصيتك، لا تظهر تفاصيلك الشخصية في صفحة المتابعة.</div>
        </div>
      )}
    </>
  );
}
