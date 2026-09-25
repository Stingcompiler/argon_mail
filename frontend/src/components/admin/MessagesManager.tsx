'use client';
import { ArrowUpLeft, Inbox, MessageCircle, Save, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { useInquiries, useInquiry, useStaff, useUpdateInquiry } from '@/hooks/admin';
import type { Inquiry, InquiryStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { LoadError, Loading } from './ui';

const STATUSES: { v: InquiryStatus | ''; l: string }[] = [{ v: '', l: 'الكل' }, { v: 'new', l: 'جديدة' }, { v: 'in_progress', l: 'قيد المتابعة' }, { v: 'done', l: 'تمت المعالجة' }];

export function MessagesManager() {
  const [status, setStatus] = useState<InquiryStatus | ''>('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(q), 350); return () => clearTimeout(t); }, [q]);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status, query]);
  const list = useInquiries({ status: status || undefined, q: query || undefined, page });
  const openParam = Number(useSearchParams().get('open')) || null;
  const [activeId, setActiveId] = useState<number | null>(openParam);
  const items = list.data?.results || [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 25)) : 1;
  // A message opened from an e-mail link may be on another page: load it directly.
  const fromList = items.find((m) => m.id === activeId) || null;
  const single = useInquiry(fromList ? null : activeId);
  const active = fromList || single.data || null;

  return (
    <>
      <div className="workspace-toolbar">
        <div className="segmented">
          {STATUSES.map((s) => <button key={s.v} className={status === s.v ? 'selected' : ''} onClick={() => setStatus(s.v)}>{s.l}</button>)}
        </div>
        <span className="muted small-text">{list.data ? `${list.data.count} رسائل` : ''}</span>
      </div>
      <div className="inbox-layout">
        <aside className="inbox-list">
          <h2 className="sr-only">الرسائل الواردة</h2>
          <div className="workspace-search"><Search size={17} /><input value={q} aria-label="بحث الرسائل" onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الرسائل..." /></div>
          {list.isLoading ? <Loading /> : list.isError ? <LoadError error={list.error} retry={() => list.refetch()} /> : <>
            {items.map((m) => (
              <button className={'message-item ' + (activeId === m.id ? 'selected' : '')} key={m.id} onClick={() => setActiveId(m.id)}>
                <div><span className="avatar">{m.name[0]}</span><b>{m.name}</b>{m.status === 'new' && <i />}</div>
                <h3>{m.subject}</h3><p>{m.body}</p>
                <small>{formatDateTime(m.created_at)}<span>{STATUSES.find((s) => s.v === m.status)?.l}</span></small>
              </button>
            ))}
            {!items.length && <div className="compact-empty"><Inbox size={30} /><p>لا توجد رسائل مطابقة.</p></div>}
            {pages > 1 && (
              <div className="pagination">
                <button className="button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>الأحدث</button>
                <span className="subtle-copy">صفحة {page} من {pages}</span>
                <button className="button secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>الأقدم</button>
              </div>
            )}
          </>}
        </aside>
        <section className="message-reader">
          {active ? <Reader key={active.id} message={active} />
            : single.isLoading ? <Loading />
            : single.isError ? <LoadError error={single.error} retry={() => single.refetch()} />
            : <div className="compact-empty"><MessageCircle size={40} /><h3>اختر رسالة لقراءة التفاصيل</h3></div>}
        </section>
      </div>
    </>
  );
}

function Reader({ message: m }: { message: Inquiry }) {
  const { notify } = useUi();
  const update = useUpdateInquiry();
  const staff = useStaff();
  const [note, setNote] = useState(m.internal_note);
  const patch = (body: Parameters<typeof update.mutate>[0], msg: string) => update.mutate(body, { onSuccess: () => notify(msg), onError: (e) => notify(e.message) });
  return (
    <>
      <div className="message-reader-top">
        <span className="eyebrow">رسالة #{m.id}</span>
        <div className="inline-actions">
          <select aria-label="المسؤول" value={m.assignee?.id ?? ''} onChange={(e) => patch({ id: m.id, assignee_id: e.target.value ? Number(e.target.value) : null }, 'تم تحديث الإسناد.')}>
            <option value="">غير مسندة</option>
            {(staff.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <select aria-label="حالة الرسالة" value={m.status} onChange={(e) => patch({ id: m.id, status: e.target.value as InquiryStatus }, 'تم تحديث حالة الرسالة.')}>
            {STATUSES.slice(1).map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>
      <h2>{m.subject}</h2>
      <div className="sender-details"><span className="avatar">{m.name[0]}</span><div><b>{m.name}</b><small>{formatDateTime(m.created_at)}</small></div></div>
      <p className="message-body preserve-lines">{m.body}</p>
      <div className="reply-guide">
        <MessageCircle size={24} />
        <div><b>أكمل التواصل عبر WhatsApp</b><p dir="ltr">{m.phone}</p></div>
        <a className="button secondary" href={m.whatsapp_url} target="_blank" rel="noopener noreferrer">تواصل <ArrowUpLeft size={15} /></a>
      </div>
      <label>ملاحظة داخلية<textarea placeholder="سجّل ما يلزم لمتابعة الرسالة..." rows={3} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <button className="button" disabled={note === m.internal_note || update.isPending} onClick={() => patch({ id: m.id, internal_note: note }, 'حُفظت الملاحظة.')}><Save size={16} />حفظ الملاحظة</button>
    </>
  );
}
