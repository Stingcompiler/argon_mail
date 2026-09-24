'use client';
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useCreateInquiry } from '@/hooks/public';
import { ApiError, fieldErrors, newIdempotencyKey } from '@/lib/api/client';
import { phoneProblem } from '@/lib/countries';
import { PhoneField } from './PhoneField';

export function ContactForm() {
  const create = useCreateInquiry();
  const key = useRef('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (create.isPending) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const phoneErr = phoneProblem(String(f.get('phone') || ''));
    if (phoneErr) { setErrors({ phone: phoneErr }); return; }
    key.current ||= newIdempotencyKey();
    setErrors({});
    create.mutate(
      { key: key.current, name: String(f.get('name')), phone: String(f.get('phone')), subject: String(f.get('subject')), body: String(f.get('body')) },
      {
        onSuccess: () => { form.reset(); key.current = ''; setSent(true); },
        onError: (err) => { if (err instanceof ApiError && err.status === 400) key.current = ''; setErrors(fieldErrors(err)); },
      },
    );
  };

  if (sent) return (
    <div className="empty-state" role="status">
      <CheckCircle2 size={40} />
      <h2>وصلت رسالتك.</h2>
      <p>سيراجعها فريق عرجون ويتواصل معك عبر WhatsApp عند الحاجة.</p>
      <button className="button secondary" onClick={() => setSent(false)}>إرسال رسالة أخرى</button>
    </div>
  );

  const err = (n: string) => errors[n] && <small className="field-error" role="alert">{errors[n]}</small>;
  return (
    <form className="request-form contact-form" onSubmit={submit}>
      {create.error && <div className="notice error" role="alert">{Object.keys(errors).length ? 'راجع الحقول المعلّمة ثم أعد الإرسال.' : create.error.message}</div>}
      <label>الاسم<input name="name" required maxLength={80} placeholder="اسمك الكامل" autoComplete="name" />{err('name')}</label>
      <PhoneField name="phone" label="رقم WhatsApp" error={errors.phone} />
      <label>الموضوع<input name="subject" required maxLength={140} placeholder="بخصوص ماذا تتواصل معنا؟" />{err('subject')}</label>
      <label>رسالتك<textarea name="body" required rows={5} maxLength={4000} placeholder="اكتب رسالتك هنا..." />{err('body')}</label>
      <button className="button" disabled={create.isPending}>
        {create.isPending ? <>جارٍ الإرسال <LoaderCircle className="spin" size={17} /></> : <>إرسال الرسالة <Send size={17} /></>}
      </button>
    </form>
  );
}
