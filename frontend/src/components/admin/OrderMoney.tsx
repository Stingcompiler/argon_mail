'use client';
import { Banknote, Check, Download, FileText, Paperclip, Receipt, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { useDownloadAttachment, useOrderActions } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { Attachment, Currency, OrderDetail, Payment, PaymentStatus } from '@/lib/api/types';
import { FILE_ACCEPT, checkFile, formatSize } from '@/lib/files';
import { formatDateTime } from '@/lib/format';

const PAYMENT_STATUSES: { v: PaymentStatus; l: string }[] = [
  { v: 'not_required', l: 'غير مطلوب' }, { v: 'awaiting', l: 'بانتظار الدفع' }, { v: 'verifying', l: 'قيد التحقق' },
  { v: 'paid', l: 'مدفوع' }, { v: 'refunded', l: 'مسترد' },
];
const CURRENCIES: { v: Currency; l: string }[] = [{ v: 'SDG', l: 'جنيه سوداني · SDG' }, { v: 'USD', l: 'دولار · USD' }, { v: 'SAR', l: 'ريال سعودي · SAR' }];
const METHODS: { v: Payment['method']; l: string }[] = [{ v: 'bank_transfer', l: 'تحويل بنكي' }, { v: 'mobile_money', l: 'تطبيق دفع' }, { v: 'cash', l: 'نقدًا' }, { v: 'other', l: 'أخرى' }];
const QUOTE_STATUS = { pending: 'بانتظار موافقة العميل', accepted: 'وافق العميل', rejected: 'رفض العميل', superseded: 'استُبدل بعرض أحدث' } as const;
const money = (amount: string, currency: string) => `${Number(amount).toLocaleString('ar', { maximumFractionDigits: 2 })} ${currency}`;

export function AttachmentList({ order, items, canUpload, maxMb }: { order: OrderDetail; items: Attachment[]; canUpload: boolean; maxMb: number }) {
  const { notify } = useUi();
  const download = useDownloadAttachment(order.id);
  const { upload } = useOrderActions(order.id);
  return (
    <div className="detail-block">
      <h3><Paperclip size={16} /> المرفقات</h3>
      {items.length ? (
        <ul className="file-list">
          {items.map((f) => (
            <li key={f.id}>
              <FileText size={16} />
              <span dir="auto" title={f.original_name}>{f.original_name}</span>
              <small>{f.field_label || (f.kind === 'payment_proof' ? 'إثبات دفع' : 'من الفريق')} · {formatSize(f.size)}</small>
              <button className="icon-button" aria-label={`تنزيل ${f.original_name}`} disabled={download.isPending}
                onClick={() => download.mutate(f.id, { onError: (e) => notify(e.message) })}><Download size={15} /></button>
            </li>
          ))}
        </ul>
      ) : <p className="subtle-copy">لا توجد مرفقات.</p>}
      {canUpload && (
        <label className="upload-area compact">
          <UploadCloud size={20} /><b>{upload.isPending ? 'جارٍ الرفع...' : 'إضافة مستند للطلب'}</b><small>PDF أو صورة · حتى {maxMb} MB</small>
          <input type="file" accept={FILE_ACCEPT} disabled={upload.isPending} onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const err = checkFile(file, false, maxMb);
            if (err) { notify(err); return; }
            upload.mutate({ file, kind: 'order_document' }, { onSuccess: () => notify('أضيف المستند.'), onError: (er) => notify(fieldErrors(er).file || er.message) });
          }} />
        </label>
      )}
      <p className="subtle-copy">روابط التنزيل صالحة لخمس دقائق ومرتبطة بحسابك.</p>
    </div>
  );
}

export function OrderMoney({ order, canEdit, maxMb }: { order: OrderDetail; canEdit: boolean; maxMb: number }) {
  const { notify } = useUi();
  const a = useOrderActions(order.id);
  const download = useDownloadAttachment(order.id);
  const [quote, setQuote] = useState({ amount: '', currency: 'SDG' as Currency, note: '' });
  const [decisionNote, setDecisionNote] = useState('');
  const [pay, setPay] = useState({ amount: '', currency: 'SDG' as Currency, method: 'bank_transfer' as Payment['method'], reference: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pending = order.quotes.find((q) => q.status === 'pending');
  const proofs = order.attachments.filter((f) => f.kind === 'payment_proof');
  const fail = (e: Error) => { setErrors(fieldErrors(e)); notify(e.message); };

  return (
    <>
      <div className="design-tip"><Banknote size={20} /><span>حالة الدفع مستقلة عن حالة التنفيذ. رفع إثبات الدفع لا يغيّر الحالة تلقائيًا.</span></div>
      <div className="payment-summary">
        <span>حالة الدفع</span>
        <strong>{order.payment_status_label}</strong>
        {canEdit && (
          <select aria-label="تغيير حالة الدفع" value={order.payment_status} disabled={a.setPaymentStatus.isPending}
            onChange={(e) => a.setPaymentStatus.mutate({ payment_status: e.target.value as PaymentStatus }, { onSuccess: () => notify('تم تحديث حالة الدفع.'), onError: fail })}>
            {PAYMENT_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        )}
      </div>

      <section className="detail-block">
        <h3><Receipt size={16} /> عروض الأسعار</h3>
        {order.quotes.length === 0 && <p className="subtle-copy">لم يُسجَّل عرض سعر بعد.</p>}
        <div className="note-list">
          {[...order.quotes].reverse().map((q) => (
            <article key={q.id} className={q.status === 'superseded' ? 'muted-card' : ''}>
              <small>الإصدار {q.version} · {q.created_by.full_name} · {formatDateTime(q.created_at)}</small>
              <b>{money(q.amount, q.currency)}</b> <span className="subtle-copy">— {QUOTE_STATUS[q.status]}</span>
              {q.note && <p>{q.note}</p>}
              {q.decided_at && <small>قرار: {q.decided_by?.full_name} · {formatDateTime(q.decided_at)}{q.decision_note && ` · ${q.decision_note}`}</small>}
            </article>
          ))}
        </div>
        {canEdit && pending && (
          <div className="inline-actions">
            <input aria-label="ملاحظة القرار" placeholder="كيف وافق العميل؟ مثال: عبر WhatsApp" value={decisionNote} maxLength={300} onChange={(e) => setDecisionNote(e.target.value)} />
            <button className="button" disabled={a.decideQuote.isPending} onClick={() => a.decideQuote.mutate({ quoteId: pending.id, decision: 'accepted', note: decisionNote }, { onSuccess: () => { setDecisionNote(''); notify('سُجّلت موافقة العميل.'); }, onError: fail })}><Check size={15} />وافق العميل</button>
            <button className="button secondary" disabled={a.decideQuote.isPending} onClick={() => a.decideQuote.mutate({ quoteId: pending.id, decision: 'rejected', note: decisionNote }, { onSuccess: () => { setDecisionNote(''); notify('سُجّل رفض العميل.'); }, onError: fail })}><X size={15} />رفض</button>
          </div>
        )}
        {canEdit && (
          <form className="money-form" onSubmit={(e) => { e.preventDefault(); setErrors({}); a.createQuote.mutate(quote, { onSuccess: () => { setQuote({ ...quote, amount: '', note: '' }); notify(pending ? 'أُنشئ عرض جديد واستُبدل السابق.' : 'أُنشئ عرض السعر.'); }, onError: fail }); }}>
            <div className="form-row">
              <label>القيمة<input required inputMode="decimal" dir="ltr" value={quote.amount} onChange={(e) => setQuote({ ...quote, amount: e.target.value })} placeholder="0.00" />{errors.amount && <small className="field-error">{errors.amount}</small>}</label>
              <label>العملة<select value={quote.currency} onChange={(e) => setQuote({ ...quote, currency: e.target.value as Currency })}>{CURRENCIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select></label>
            </div>
            <label>ملاحظة داخلية<input value={quote.note} maxLength={500} onChange={(e) => setQuote({ ...quote, note: e.target.value })} /></label>
            <button className="button secondary" disabled={a.createQuote.isPending}>{pending ? 'عرض سعر جديد (يستبدل الحالي)' : 'إضافة عرض سعر'}</button>
          </form>
        )}
      </section>

      <section className="detail-block">
        <h3><Banknote size={16} /> الدفعات المسجلة</h3>
        {order.payments.length === 0 && <p className="subtle-copy">لا توجد دفعات مسجلة.</p>}
        <div className="note-list">
          {order.payments.map((p) => (
            <article key={p.id}>
              <small>{p.recorded_by.full_name} · {formatDateTime(p.created_at)}</small>
              <b>{money(p.amount, p.currency)}</b> <span className="subtle-copy">— {p.method_label}{p.reference && ` · ${p.reference}`}</span>
              {p.note && <p>{p.note}</p>}
            </article>
          ))}
        </div>
        {canEdit && (
          <form className="money-form" onSubmit={(e) => { e.preventDefault(); setErrors({}); a.recordPayment.mutate(pay, { onSuccess: () => { setPay({ ...pay, amount: '', reference: '', note: '' }); notify('سُجّلت الدفعة. غيّر حالة الدفع عند التأكد.'); }, onError: fail }); }}>
            <div className="form-row">
              <label>المبلغ<input required inputMode="decimal" dir="ltr" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder="0.00" /></label>
              <label>العملة<select value={pay.currency} onChange={(e) => setPay({ ...pay, currency: e.target.value as Currency })}>{CURRENCIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select></label>
            </div>
            <div className="form-row">
              <label>الطريقة<select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as Payment['method'] })}>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
              <label>المرجع<input value={pay.reference} maxLength={120} dir="auto" onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="رقم العملية" /></label>
            </div>
            <button className="button secondary" disabled={a.recordPayment.isPending}>تسجيل دفعة</button>
          </form>
        )}
      </section>

      <section className="detail-block">
        <h3><Paperclip size={16} /> إثباتات الدفع</h3>
        {proofs.length ? (
          <ul className="file-list">
            {proofs.map((f) => (
              <li key={f.id}><FileText size={16} /><span dir="auto">{f.original_name}</span><small>{formatSize(f.size)}</small>
                <button className="icon-button" aria-label={`تنزيل ${f.original_name}`} onClick={() => download.mutate(f.id, { onError: (e) => notify(e.message) })}><Download size={15} /></button></li>
            ))}
          </ul>
        ) : <p className="subtle-copy">لا توجد إثباتات مرفوعة.</p>}
        {canEdit && (
          <label className="upload-area compact">
            <UploadCloud size={20} /><b>{a.upload.isPending ? 'جارٍ الرفع...' : 'رفع إثبات دفع'}</b><small>PDF أو صورة · حتى {maxMb} MB</small>
            <input type="file" accept={FILE_ACCEPT} disabled={a.upload.isPending} onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const err = checkFile(file, false, maxMb);
              if (err) { notify(err); return; }
              a.upload.mutate({ file, kind: 'payment_proof', payment: order.payments.at(-1)?.id }, { onSuccess: () => notify('رُفع الإثبات. تحقق منه ثم غيّر حالة الدفع يدويًا.'), onError: (er) => notify(fieldErrors(er).file || er.message) });
            }} />
          </label>
        )}
      </section>
    </>
  );
}
