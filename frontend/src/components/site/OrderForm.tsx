'use client';
import { ArrowLeft, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useCreateOrder } from '@/hooks/public';
import { ApiError, fieldErrors, newIdempotencyKey } from '@/lib/api/client';
import type { PublicServiceDetail, ServiceField } from '@/lib/api/types';
import { FILE_ACCEPT, IMAGE_ACCEPT, checkFile, formatSize } from '@/lib/files';
import { phoneProblem } from '@/lib/countries';
import { FieldError, describedBy, errorId, useFocusInvalid } from '@/lib/forms';
import { PhoneField } from './PhoneField';

type Limits = { maxFileMb: number; maxFiles: number; maxTotalMb: number };

/**
 * Inputs are uncontrolled and live in the DOM, so they survive a failed
 * submission. One idempotency key is kept for all retries of the same
 * submission; the server returns the original order if it already exists.
 */
export function OrderForm({ service, limits }: { service: PublicServiceDetail; limits: Limits }) {
  const router = useRouter();
  const create = useCreateOrder();
  const key = useRef<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formRef, focusInvalid] = useFocusInvalid();
  // Selected files are kept in state so they survive a failed submission.
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const totalFiles = Object.values(files).reduce((n, l) => n + l.length, 0);
  const addFiles = (f: ServiceField, picked: FileList | null) => {
    if (!picked?.length) return;
    const current = files[f.key] || [];
    const next = [...current];
    let problem = '';
    for (const file of Array.from(picked)) {
      const err = checkFile(file, f.type === 'image', limits.maxFileMb);
      if (err) { problem = err; continue; }
      if (next.length >= f.max_files) { problem = `الحد الأقصى ${f.max_files} ملفات لهذا الحقل.`; break; }
      if (totalFiles - current.length + next.length >= limits.maxFiles) { problem = `الحد الأقصى ${limits.maxFiles} ملفات لكل طلب.`; break; }
      const otherBytes = Object.entries(files).filter(([k]) => k !== f.key).flatMap(([, l]) => l).reduce((n, x) => n + x.size, 0);
      if (otherBytes + next.reduce((n, x) => n + x.size, 0) + file.size > limits.maxTotalMb * 1024 * 1024) {
        problem = `مجموع أحجام الملفات لا يتجاوز ${limits.maxTotalMb} MB لكل طلب.`; continue;
      }
      next.push(file);
    }
    setFiles({ ...files, [f.key]: next });
    setErrors((e) => { const n = { ...e }; if (problem) n[`answers.${f.key}`] = problem; else delete n[`answers.${f.key}`]; return n; });
  };
  const removeFile = (k: string, i: number) => setFiles({ ...files, [k]: (files[k] || []).filter((_, j) => j !== i) });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (create.isPending) return;
    const data = new FormData(e.currentTarget);
    const answers: Record<string, string | string[]> = {};
    const phoneErr = phoneProblem(String(data.get('customer_phone') || ''));
    if (phoneErr) { setErrors({ customer_phone: phoneErr }); focusInvalid(); return; }
    const missing = service.fields.filter((f) => (f.type === 'file' || f.type === 'image') && f.required && !(files[f.key] || []).length);
    if (missing.length) {
      setErrors(Object.fromEntries(missing.map((f) => [`answers.${f.key}`, 'أرفق ملفًا واحدًا على الأقل.'])));
      focusInvalid();
      return;
    }
    service.fields.forEach((f) => {
      if (f.type === 'file' || f.type === 'image') return;
      answers[f.key] = f.type === 'multiselect' ? data.getAll(`f-${f.key}`).map(String) : String(data.get(`f-${f.key}`) || '');
    });
    key.current ||= newIdempotencyKey();
    setErrors({});
    create.mutate(
      {
        key: key.current,
        service: service.slug,
        customer_name: String(data.get('name') || ''),
        customer_phone: String(data.get('customer_phone') || ''),
        details: String(data.get('details') || ''),
        consent: data.get('consent') === 'on',
        answers,
        files,
      },
      {
        onSuccess: (order) => router.push(`/order-success?code=${encodeURIComponent(order.code)}`),
        onError: (err) => {
          // A validation error means nothing was created: the next attempt is a new submission.
          if (err instanceof ApiError && err.status === 400) key.current = '';
          setErrors(fieldErrors(err));
          focusInvalid();
        },
      },
    );
  };

  const general = create.error && !Object.keys(errors).length ? create.error.message : '';

  return (
    <form ref={formRef} className="request-form" onSubmit={submit} noValidate={false}>
      <span className="eyebrow">لنبدأ الخطوة الأولى</span>
      <h2>أخبرنا عن طلبك</h2>
      <p>املأ التفاصيل التالية، وسيتمكن المسؤول من مراجعة طلبك والتواصل معك.</p>
      {(general || Object.keys(errors).length > 0) && (
        <div className="notice error" role="alert">{general || 'راجع الحقول المعلّمة ثم أعد الإرسال. بياناتك ما زالت في النموذج.'}</div>
      )}
      <label>
        الاسم الكامل <em>*</em>
        <input name="name" placeholder="كيف نناديك؟" required minLength={2} maxLength={80} autoComplete="name"
          aria-invalid={!!errors.customer_name} aria-describedby={describedBy(errors.customer_name && errorId('customer_name'))} />
        <FieldError name="customer_name" error={errors.customer_name} />
      </label>
      <PhoneField name="customer_phone" label="رقم الهاتف المستخدم في WhatsApp" error={errors.customer_phone} />
      {service.fields.map((f) => (f.type === 'file' || f.type === 'image')
        ? <FileField key={f.key} field={f} files={files[f.key] || []} maxMb={limits.maxFileMb} error={errors[`answers.${f.key}`] || errors[`answers.${f.key}.0`]}
            onAdd={(l) => addFiles(f, l)} onRemove={(i) => removeFile(f.key, i)} />
        : <DynamicField key={f.key} field={f} error={errors[`answers.${f.key}`]} />)}
      <FieldError name="answers.files" error={errors['answers.files']} />
      <label>
        تفاصيل إضافية
        <textarea name="details" placeholder="ما الذي تود أن نعرفه عن طلبك؟" rows={4} maxLength={4000}
          aria-invalid={!!errors.details} aria-describedby={describedBy(errors.details && errorId('details'))} />
        <FieldError name="details" error={errors.details} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="consent" required
          aria-invalid={!!errors.consent} aria-describedby={describedBy(errors.consent && errorId('consent'))} />
        <span>أوافق على <Link href="/terms" target="_blank">شروط الاستخدام</Link> و<Link href="/privacy" target="_blank">سياسة الخصوصية</Link>.</span>
      </label>
      <FieldError name="consent" error={errors.consent} />
      <button className="button wide" disabled={create.isPending} aria-busy={create.isPending}>
        {create.isPending ? <>جارٍ الإرسال <LoaderCircle className="spin" size={18} /></> : <>إرسال الطلب <ArrowLeft size={18} /></>}
      </button>
    </form>
  );
}

function FileField({ field: f, files, maxMb, error, onAdd, onRemove }: {
  field: ServiceField; files: File[]; maxMb: number; error?: string; onAdd: (l: FileList | null) => void; onRemove: (i: number) => void;
}) {
  const image = f.type === 'image';
  const full = files.length >= f.max_files;
  return (
    <div className="file-field">
      <span className="file-field-label">{f.label}{f.required && <em> *</em>}</span>
      {f.help_text && <small>{f.help_text}</small>}
      {!full && (
        <label className="upload-area">
          <UploadCloud size={27} />
          <b>{image ? 'اختر صورة' : 'اختر ملفًا'}{f.max_files > 1 ? ` (حتى ${f.max_files})` : ''}</b>
          <small>{image ? 'PNG أو JPG أو WebP' : 'PDF أو صورة'} · حتى {maxMb} MB للملف</small>
          <input type="file" accept={image ? IMAGE_ACCEPT : FILE_ACCEPT} multiple={f.max_files > 1}
            aria-invalid={!!error} aria-describedby={describedBy(error && errorId(`answers.${f.key}`))}
            onChange={(e) => { onAdd(e.target.files); e.target.value = ''; }} />
        </label>
      )}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`}>
              <FileText size={16} /><span dir="auto">{file.name}</span><small>{formatSize(file.size)}</small>
              <button type="button" className="icon-button" aria-label={`إزالة ${file.name}`} onClick={() => onRemove(i)}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <FieldError name={`answers.${f.key}`} error={error} live />
    </div>
  );
}

function DynamicField({ field: f, error }: { field: ServiceField; error?: string }) {
  const name = `f-${f.key}`;
  const errName = `answers.${f.key}`;
  const common = { name, required: f.required, 'aria-invalid': !!error, 'aria-describedby': describedBy(f.help_text && `${name}-help`, error && errorId(errName)) };
  let control;
  if (f.type === 'textarea' || f.type === 'address') control = <textarea {...common} rows={3} maxLength={f.max_length} placeholder={f.type === 'address' ? 'المدينة، الحي، أقرب معلم' : undefined} />;
  else if (f.type === 'select') control = (
    <select {...common} defaultValue="">
      <option value="" disabled>اختر من القائمة</option>
      {f.options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  else if (f.type === 'multiselect') return (
    <fieldset className="choice-group" aria-describedby={describedBy(f.help_text && `${name}-help`, error && errorId(errName))}>
      <legend>{f.label}{f.required && <em> *</em>}</legend>
      {f.help_text && <small id={`${name}-help`}>{f.help_text}</small>}
      {f.options.map((o) => <label className="checkbox-row" key={o}><input type="checkbox" name={name} value={o} aria-invalid={!!error} />{o}</label>)}
      <FieldError name={errName} error={error} />
    </fieldset>
  );
  else control = <input {...common} type={f.type === 'number' ? 'text' : f.type} inputMode={f.type === 'number' ? 'decimal' : undefined} maxLength={f.type === 'text' ? f.max_length : undefined} />;
  return (
    <label>
      {f.label}{f.required && <em> *</em>}
      {control}
      {f.help_text && <small id={`${name}-help`}>{f.help_text}</small>}
      <FieldError name={errName} error={error} />
    </label>
  );
}
