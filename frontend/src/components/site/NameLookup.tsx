'use client';
import { ArrowLeft, LoaderCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useTrackingLookup } from '@/hooks/public';
import { ApiError, fieldErrors } from '@/lib/api/client';
import { phoneProblem } from '@/lib/countries';
import { formatDate, statusTone } from '@/lib/format';
import { PhoneField } from './PhoneField';
import { RememberCode } from './RememberCode';

/** Track by full name + the WhatsApp number used in the order. */
export function NameLookup() {
  const lookup = useTrackingLookup();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get('phone') || '');
    const full_name = String(f.get('full_name') || '').trim();
    const pe = phoneProblem(phone);
    if (pe) { setErrors({ phone: pe }); return; }
    setErrors({});
    lookup.mutate({ full_name, phone }, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  const notFound = lookup.error instanceof ApiError && lookup.error.status === 404;
  const results = lookup.data?.results;

  return (
    <>
      <form className="request-form name-lookup" onSubmit={submit}>
        <p className="subtle-copy">اكتب اسمك الكامل ورقم WhatsApp كما أدخلتهما في الطلب. يجب أن يتطابق الاثنان، حفاظًا على خصوصيتك.</p>
        <label>
          الاسم الكامل <em>*</em>
          <input name="full_name" required minLength={2} maxLength={80} autoComplete="name" aria-invalid={!!errors.full_name} />
          {errors.full_name && <small className="field-error" role="alert">{errors.full_name}</small>}
        </label>
        <PhoneField name="phone" label="رقم WhatsApp المستخدم في الطلب" error={errors.phone} />
        <button className="button" disabled={lookup.isPending}>
          {lookup.isPending ? <>جارٍ البحث <LoaderCircle className="spin" size={17} /></> : <>ابحث عن طلباتي <Search size={17} /></>}
        </button>
      </form>

      {notFound && (
        <div className="empty-state" role="alert">
          <Search size={35} />
          <h2>لم نعثر على طلبات</h2>
          <p>تأكد من كتابة الاسم الكامل ورقم الهاتف كما في الطلب، أو استخدم رقم الطلب.</p>
        </div>
      )}
      {lookup.error && !notFound && !Object.keys(errors).length && (
        <div className="empty-state" role="alert"><h2>تعذّر البحث الآن</h2><p>{lookup.error.message}</p></div>
      )}

      {results && (
        <div className="tracking-result">
          <div className="result-heading"><div><small>طلباتك</small><h2>{results.length === 1 ? 'وجدنا طلبًا واحدًا' : `وجدنا ${results.length} طلبات`}</h2></div></div>
          <RememberCode compact />
          <ul className="lookup-list">
            {results.map((o) => (
              <li key={o.code}>
                <div>
                  <b>{o.service_name}</b>
                  <small>رقم الطلب <bdi dir="ltr" className="order-id">{o.code}</bdi> · {formatDate(o.created_at)}</small>
                </div>
                <span className={`badge ${statusTone(o.status.meaning)}`}><i />{o.status.label}</span>
                <Link className="text-button" href={`/track?code=${encodeURIComponent(o.code)}`}>التفاصيل <ArrowLeft size={15} /></Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
