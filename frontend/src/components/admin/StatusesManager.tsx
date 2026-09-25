'use client';
import { ArrowDown, ArrowUp, Clock3, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';
import { useStatusActions, useStatuses } from '@/hooks/admin';
import { fieldErrors } from '@/lib/api/client';
import type { OrderStatus, StatusMeaning } from '@/lib/api/types';
import { LoadError, Loading, SectionTitle, StatusBadge, Toggle } from './ui';

export const MEANINGS: { v: StatusMeaning; l: string }[] = [
  { v: 'new', l: 'جديد' }, { v: 'in_review', l: 'قيد المراجعة' }, { v: 'waiting_customer', l: 'بانتظار العميل' },
  { v: 'in_progress', l: 'قيد التنفيذ' }, { v: 'ready', l: 'جاهز للتسليم' }, { v: 'completed', l: 'مكتمل' },
  { v: 'cancelled', l: 'ملغي' }, { v: 'failed', l: 'متعذر التنفيذ' },
];

/**
 * Editable status labels on top of fixed internal meanings. A status used by
 * orders cannot be deleted (only deactivated), and the initial status stays
 * active, so history and new orders are never broken.
 */
export function StatusesManager() {
  const { user } = useAuth();
  const { notify } = useUi();
  const statuses = useStatuses();
  const { create, update, remove } = useStatusActions();
  const canEdit = user?.role === 'admin';
  const [draft, setDraft] = useState<{ label: string; meaning: StatusMeaning }>({ label: '', meaning: 'in_progress' });
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (statuses.isLoading) return <Loading />;
  if (statuses.isError) return <LoadError error={statuses.error} retry={() => statuses.refetch()} />;
  const list = statuses.data!;
  const fail = (e: Error) => notify(fieldErrors(e).label || fieldErrors(e).is_active || e.message);

  const move = (i: number, d: -1 | 1) => {
    const a = list[i], b = list[i + d];
    // Swap positions; equal sort_order values get distinct ones.
    const aOrder = b.sort_order === a.sort_order ? a.sort_order + d : b.sort_order;
    update.mutate({ id: a.id, sort_order: aOrder }, { onError: fail });
    update.mutate({ id: b.id, sort_order: a.sort_order }, { onError: fail });
  };

  return (
    <>
      <section className="editor-panel">
        <SectionTitle icon={Clock3} title="حالات الطلب كما تسميها" text="الاسم يظهر للعميل في صفحة المتابعة. المعنى الداخلي ثابت ويُستخدم في الإحصاءات والألوان." />
        {!canEdit && <div className="notice">تعديل الحالات متاح للمدير فقط.</div>}
        <div className="table-scroll">
          <table>
            <thead><tr><th>الترتيب</th><th>الاسم</th><th>المعنى الداخلي</th><th>الطلبات</th><th>مفعّلة</th><th /></tr></thead>
            <tbody>
              {list.map((s: OrderStatus, i) => {
                const label = labels[s.id] ?? s.label;
                const dirty = label.trim() !== s.label;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="inline-actions">
                        <button className="icon-button" aria-label={`تحريك ${s.label} للأعلى`} disabled={!canEdit || i === 0 || update.isPending} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                        <button className="icon-button" aria-label={`تحريك ${s.label} للأسفل`} disabled={!canEdit || i === list.length - 1 || update.isPending} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                      </div>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <input className="table-select" aria-label={`اسم الحالة ${s.label}`} value={label} maxLength={60} disabled={!canEdit}
                          onChange={(e) => setLabels({ ...labels, [s.id]: e.target.value })} />
                        {dirty && canEdit && (
                          <button className="icon-button" aria-label="حفظ الاسم" onClick={() => update.mutate({ id: s.id, label: label.trim() }, {
                            onSuccess: () => { const n = { ...labels }; delete n[s.id]; setLabels(n); notify('حُفظ اسم الحالة.'); }, onError: fail,
                          })}><Save size={14} /></button>
                        )}
                      </div>
                      {s.is_initial && <small className="muted">الحالة الأولى لكل طلب جديد</small>}
                    </td>
                    <td><StatusBadge meaning={s.meaning} label={MEANINGS.find((m) => m.v === s.meaning)?.l || s.meaning} /></td>
                    <td>{s.orders_count}</td>
                    <td><Toggle checked={s.is_active} disabled={!canEdit || s.is_initial} label={`تفعيل ${s.label}`}
                      onChange={(v) => update.mutate({ id: s.id, is_active: v }, { onSuccess: () => notify(v ? 'فُعّلت الحالة.' : 'عُطّلت الحالة؛ تبقى في الطلبات السابقة.'), onError: fail })} /></td>
                    <td>
                      <button className="icon-button danger" aria-label={`حذف ${s.label}`} disabled={!canEdit || s.is_initial || s.orders_count > 0 || remove.isPending}
                        title={s.orders_count > 0 ? 'مستخدمة في طلبات؛ عطّلها بدل الحذف' : 'حذف'}
                        onClick={() => confirm(`حذف الحالة «${s.label}»؟`) && remove.mutate(s.id, { onSuccess: () => notify('حُذفت الحالة.'), onError: fail })}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {canEdit && (
        <form className="editor-panel" onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          create.mutate({ label: draft.label.trim(), meaning: draft.meaning }, {
            onSuccess: () => { setDraft({ ...draft, label: '' }); notify('أضيفت الحالة في آخر القائمة.'); },
            onError: (er) => setErrors(fieldErrors(er)),
          });
        }}>
          <SectionTitle icon={Plus} title="حالة جديدة" text="اختر المعنى الأقرب لها؛ يحدد لونها ومكانها في الإحصاءات." />
          <div className="form-row">
            <label>اسم الحالة<input required maxLength={60} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="مثال: بانتظار الشحن" />{errors.label && <small className="field-error">{errors.label}</small>}</label>
            <label>المعنى الداخلي<select value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value as StatusMeaning })}>
              {MEANINGS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select></label>
          </div>
          <button className="button" disabled={create.isPending}><Plus size={16} />إضافة الحالة</button>
        </form>
      )}
    </>
  );
}
