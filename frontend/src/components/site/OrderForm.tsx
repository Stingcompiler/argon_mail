'use client';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useCreateOrder } from '@/hooks/public';
import { ApiError, fieldErrors, newIdempotencyKey } from '@/lib/api/client';
import type { PublicServiceDetail, ServiceField } from '@/lib/api/types';

/**
 * Inputs are uncontrolled and live in the DOM, so they survive a failed
 * submission. One idempotency key is kept for all retries of the same
 * submission; the server returns the original order if it already exists.
 */
export function OrderForm({ service }: { service: PublicServiceDetail }) {
  const router = useRouter();
  const create = useCreateOrder();
  const key = useRef<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (create.isPending) return;
    const data = new FormData(e.currentTarget);
    const answers: Record<string, string | string[]> = {};
    service.fields.forEach((f) => {
      answers[f.key] = f.type === 'multiselect' ? data.getAll(`f-${f.key}`).map(String) : String(data.get(`f-${f.key}`) || '');
    });
    key.current ||= newIdempotencyKey();
    setErrors({});
    create.mutate(
      {
        key: key.current,
        service: service.slug,
        customer_name: String(data.get('name') || ''),
        customer_phone: String(data.get('phone') || ''),
        details: String(data.get('details') || ''),
        consent: data.get('consent') === 'on',
        answers,
      },
      {
        onSuccess: (order) => router.push(`/order-success?code=${encodeURIComponent(order.code)}`),
        onError: (err) => {
          // A validation error means nothing was created: the next attempt is a new submission.
          if (err instanceof ApiError && err.status === 400) key.current = '';
          setErrors(fieldErrors(err));
        },
      },
    );
  };

  const err = (name: string) => errors[name] && <small className="field-error" role="alert">{errors[name]}</small>;
  const general = create.error && !Object.keys(errors).length ? create.error.message : '';

  return (
    <form className="request-form" onSubmit={submit} noValidate={false}>
      <span className="eyebrow">لنبدأ الخطوة الأولى</span>
      <h2>أخبرنا عن طلبك</h2>
      <p>املأ التفاصيل التالية، وسيتمكن المسؤول من مراجعة طلبك والتواصل معك.</p>
      {(general || Object.keys(errors).length > 0) && (
        <div className="notice error" role="alert">{general || 'راجع الحقول المعلّمة ثم أعد الإرسال. بياناتك ما زالت في النموذج.'}</div>
      )}
      <label>
        الاسم الكامل <em>*</em>
        <input name="name" placeholder="كيف نناديك؟" required minLength={2} maxLength={80} autoComplete="name" aria-invalid={!!errors.customer_name} />
        {err('customer_name')}
      </label>
      <label>
        رقم الهاتف المستخدم في WhatsApp <em>*</em>
        <input name="phone" type="tel" dir="ltr" placeholder="+249 9XX XXX XXX" required pattern="[\+0-9 \(\)\-]{8,24}" autoComplete="tel" aria-invalid={!!errors.customer_phone} />
        <small>أدخل الرقم مع رمز الدولة، مثل ‎+249.</small>
        {err('customer_phone')}
      </label>
      {service.fields.map((f) => <DynamicField key={f.key} field={f} error={errors[`answers.${f.key}`]} />)}
      <label>
        تفاصيل إضافية
        <textarea name="details" placeholder="ما الذي تود أن نعرفه عن طلبك؟" rows={4} maxLength={4000} />
        {err('details')}
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="consent" required />
        <span>أوافق على <Link href="/terms" target="_blank">شروط الاستخدام</Link> و<Link href="/privacy" target="_blank">سياسة الخصوصية</Link>.</span>
      </label>
      {err('consent')}
      <button className="button wide" disabled={create.isPending} aria-busy={create.isPending}>
        {create.isPending ? <>جارٍ الإرسال <LoaderCircle className="spin" size={18} /></> : <>إرسال الطلب <ArrowLeft size={18} /></>}
      </button>
    </form>
  );
}

function DynamicField({ field: f, error }: { field: ServiceField; error?: string }) {
  const name = `f-${f.key}`;
  const common = { name, required: f.required, 'aria-invalid': !!error, 'aria-describedby': f.help_text ? `${name}-help` : undefined };
  let control;
  if (f.type === 'textarea' || f.type === 'address') control = <textarea {...common} rows={3} maxLength={f.max_length} placeholder={f.type === 'address' ? 'المدينة، الحي، أقرب معلم' : undefined} />;
  else if (f.type === 'select') control = (
    <select {...common} defaultValue="">
      <option value="" disabled>اختر من القائمة</option>
      {f.options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  else if (f.type === 'multiselect') return (
    <fieldset className="choice-group" aria-invalid={!!error}>
      <legend>{f.label}{f.required && <em> *</em>}</legend>
      {f.help_text && <small id={`${name}-help`}>{f.help_text}</small>}
      {f.options.map((o) => <label className="checkbox-row" key={o}><input type="checkbox" name={name} value={o} />{o}</label>)}
      {error && <small className="field-error" role="alert">{error}</small>}
    </fieldset>
  );
  else control = <input {...common} type={f.type === 'number' ? 'text' : f.type} inputMode={f.type === 'number' ? 'decimal' : undefined} maxLength={f.type === 'text' ? f.max_length : undefined} />;
  return (
    <label>
      {f.label}{f.required && <em> *</em>}
      {control}
      {f.help_text && <small id={`${name}-help`}>{f.help_text}</small>}
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}
