'use client';
import { Check, Eye, FileText, History, Inbox, LockKeyhole, MessageCircle, Save, StickyNote, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { useOrder, useOrderActions, useStaff, useStatuses } from '@/hooks/admin';
import { formatDate, formatDateTime } from '@/lib/format';
import { LoadError, Loading, StatusBadge, useDialogFocus } from './ui';

const eventText = (kind: string, data: Record<string, unknown>) =>
  kind === 'created' ? 'تم إنشاء الطلب'
  : kind === 'status_changed' ? `تغيير الحالة من «${data.from}» إلى «${data.to}»`
  : kind === 'assigned' ? (data.assignee ? `إسناد إلى ${data.assignee}` : 'إلغاء الإسناد')
  : data.visibility === 'public' ? 'إضافة ملاحظة للعميل' : 'إضافة ملاحظة داخلية';

export function OrderDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { user } = useAuth();
  const { notify } = useUi();
  const order = useOrder(id);
  const statuses = useStatuses();
  const staff = useStaff();
  const actions = useOrderActions(id);
  const [tab, setTab] = useState('details');
  // Drafts are local state: they survive refetches and an expired session.
  const [status, setStatus] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [note, setNote] = useState({ body: '', visibility: 'internal' as 'internal' | 'public' });
  useDialogFocus(true, onClose);
  const o = order.data;
  useEffect(() => { if (o && !status) setStatus(o.status.key); }, [o, status]);

  const saveStatus = () => actions.changeStatus.mutate(
    { status, public_note: publicNote },
    { onSuccess: () => { setPublicNote(''); notify('تم حفظ التحديث. الحالة والملاحظة العامة تظهران في صفحة المتابعة.'); }, onError: (e) => notify(e.message) },
  );
  const saveNote = () => actions.addNote.mutate(note, {
    onSuccess: () => { setNote({ ...note, body: '' }); notify('أضيفت الملاحظة.'); }, onError: (e) => notify(e.message),
  });
  const canAssign = user?.role !== 'executor';

  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="service-drawer order-drawer" role="dialog" aria-modal="true" aria-label="تفاصيل الطلب">
        <header>
          <div>
            <span className="eyebrow">طلب خدمة{o && ` · ${formatDate(o.created_at)}`}</span>
            <h2 className="order-id" dir="ltr">{o?.code || '...'}</h2>
          </div>
          <button className="icon-button" aria-label="إغلاق تفاصيل الطلب" onClick={onClose}><X /></button>
        </header>
        {order.isLoading && <Loading />}
        {order.isError && <LoadError error={order.error} retry={() => order.refetch()} />}
        {o && <>
          <div className="order-summary">
            <div><h3>{o.service_name}</h3><span className="subtle-copy">{o.customer_name}</span></div>
            <StatusBadge meaning={o.status.meaning} label={o.status.label} />
          </div>
          <div className="editor-tabs" role="tablist">
            {[{ id: 'details', name: 'التفاصيل', icon: FileText }, { id: 'notes', name: 'الملاحظات', icon: StickyNote }, { id: 'history', name: 'السجل', icon: History }].map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'selected' : ''} onClick={() => setTab(t.id)}><t.icon size={15} />{t.name}</button>
            ))}
          </div>
          <div className="drawer-body">
            {tab === 'details' && <>
              <div className="customer-card">
                <span className="avatar">{o.customer_name[0]}</span>
                <div><b>{o.customer_name}</b><small dir="ltr">{o.customer_phone}</small></div>
                <a className="button secondary" href={o.whatsapp_url} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />WhatsApp</a>
              </div>
              <div className="detail-block">
                <h3>تفاصيل الطلب</h3>
                {o.answers.map((a) => (
                  <div className="answer-row" key={a.key}><span>{a.label}</span><b>{Array.isArray(a.value) ? a.value.join('، ') || '—' : a.value || '—'}</b></div>
                ))}
                {o.details && <div className="answer-row"><span>تفاصيل إضافية</span><b className="preserve-lines">{o.details}</b></div>}
                <div className="answer-row"><span>نسخة النموذج</span><b>{o.form_version} · {o.service_snapshot.price_label}</b></div>
              </div>
              <div className="form-row">
                <label>
                  حالة التنفيذ
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {(statuses.data || []).filter((s) => s.is_active || s.key === o.status.key).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </label>
                <label>
                  المسؤول عن الطلب
                  <select value={o.assignee?.id ?? ''} disabled={!canAssign || actions.assign.isPending}
                    onChange={(e) => actions.assign.mutate(e.target.value ? Number(e.target.value) : null, {
                      onSuccess: () => notify('تم تحديث الإسناد.'), onError: (err) => notify(err.message),
                    })}>
                    <option value="">غير مسند</option>
                    {(staff.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>
              </div>
              <div className="note-block public">
                <span><Eye size={17} />ملاحظة للعميل مع التحديث (اختيارية)</span>
                <p>تظهر لمن يحمل رقم المتابعة. لا تكتب فيها بيانات شخصية.</p>
                <textarea aria-label="ملاحظة عامة" rows={3} maxLength={2000} value={publicNote} onChange={(e) => setPublicNote(e.target.value)} />
              </div>
            </>}
            {tab === 'notes' && <>
              <div className={'note-block ' + note.visibility}>
                <span>{note.visibility === 'internal' ? <><LockKeyhole size={17} />ملاحظة داخلية</> : <><Eye size={17} />ملاحظة للعميل</>}</span>
                <p>{note.visibility === 'internal' ? 'لفريق العمل فقط. لا تظهر في صفحة المتابعة.' : 'تظهر لمن يحمل رقم المتابعة.'}</p>
                <div className="segmented">
                  <button className={note.visibility === 'internal' ? 'selected' : ''} onClick={() => setNote({ ...note, visibility: 'internal' })}>داخلية</button>
                  <button className={note.visibility === 'public' ? 'selected' : ''} onClick={() => setNote({ ...note, visibility: 'public' })}>للعميل</button>
                </div>
                <textarea aria-label="نص الملاحظة" rows={4} maxLength={2000} value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} />
                <button className="button" disabled={!note.body.trim() || actions.addNote.isPending} onClick={saveNote}><Save size={16} />إضافة الملاحظة</button>
              </div>
              <div className="note-list">
                {[...o.notes].reverse().map((n) => (
                  <article key={n.id} className={n.visibility}>
                    <small>{n.visibility === 'internal' ? 'داخلية' : 'للعميل'} · {n.author.full_name} · {formatDateTime(n.created_at)}</small>
                    <p className="preserve-lines">{n.body}</p>
                  </article>
                ))}
                {!o.notes.length && <p className="subtle-copy">لا توجد ملاحظات بعد.</p>}
              </div>
            </>}
            {tab === 'history' && (
              <div className="activity-list">
                {[...o.events].reverse().map((ev) => (
                  <div key={ev.id}>
                    <span>{ev.kind === 'created' ? <Inbox size={13} /> : <Check size={13} />}</span>
                    <section>
                      <b>{eventText(ev.kind, ev.data)}</b>
                      <small>{formatDateTime(ev.created_at)} · {ev.actor?.full_name || 'العميل'}{ev.is_public ? ' · ظاهر للعميل' : ''}</small>
                    </section>
                  </div>
                ))}
              </div>
            )}
          </div>
          <footer className="drawer-footer">
            <span><LockKeyhole size={14} />كل تعديل يُسجَّل باسمك</span>
            <div>
              <button className="button secondary" onClick={onClose}>إغلاق</button>
              {tab === 'details' && (
                <button className="button" onClick={saveStatus} disabled={actions.changeStatus.isPending || (status === o.status.key && !publicNote.trim())}>
                  <Save size={16} />حفظ التحديث
                </button>
              )}
            </div>
          </footer>
        </>}
      </section>
    </div>
  );
}
