'use client';
import { useMemo, useState } from 'react';
import { DEFAULT_COUNTRY, composePhone, countries, dialCode } from '@/lib/countries';
import { FieldError, describedBy, errorId } from '@/lib/forms';

/**
 * Country picker + local number. The customer only chooses the country
 * name; its calling code is added automatically. A hidden input named
 * `name` carries the full international number (+249912345678), so forms
 * read it exactly as before.
 */
export function PhoneField({ name, label, error, required = true }: { name: string; label: string; error?: string; required?: boolean }) {
  const [iso, setIso] = useState(DEFAULT_COUNTRY);
  const [local, setLocal] = useState('');
  const list = useMemo(countries, []);
  const full = composePhone(iso, local);
  const id = `${name}-local`;
  const hint = `${id}-hint`;
  const intl = local.trim().startsWith('+') || local.replace(/\D/g, '').startsWith('00');
  return (
    <fieldset className="phone-field">
      <legend>{label}{required && <em> *</em>}</legend>
      <div className="phone-row">
        <select aria-label="الدولة" value={iso} onChange={(e) => setIso(e.target.value)} autoComplete="country">
          <optgroup label="الأكثر استخدامًا">
            {list.common.map((c) => <option key={c.iso} value={c.iso}>{c.name} (+{c.dial})</option>)}
          </optgroup>
          <optgroup label="كل الدول">
            {list.others.map((c) => <option key={c.iso} value={c.iso}>{c.name} (+{c.dial})</option>)}
          </optgroup>
        </select>
        <span className="dial" dir="ltr" aria-hidden="true">+{dialCode(iso)}</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          dir="ltr"
          aria-label="رقم الهاتف بدون مفتاح الدولة"
          aria-describedby={describedBy(hint, error && errorId(name))}
          aria-invalid={!!error}
          placeholder="9XX XXX XXX"
          autoComplete="tel-national"
          required={required}
          maxLength={20}
          pattern="[\+0-9 \(\)\-]{6,20}"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
      </div>
      <input type="hidden" name={name} value={full} />
      <small id={hint}>
        {full ? <>سيُحفظ الرقم: <bdi dir="ltr">{full}</bdi>{intl && ' (رقم دولي كامل)'}</> : 'اختر دولتك ثم اكتب رقمك كما تستخدمه في WhatsApp.'}
      </small>
      <FieldError name={name} error={error} />
    </fieldset>
  );
}
