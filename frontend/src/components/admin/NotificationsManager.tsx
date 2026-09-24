'use client';
import { AlertTriangle, CheckCircle2, Clock3, Mail, RotateCw, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { useNotifications, useResendNotification } from '@/hooks/admin';
import type { NotificationStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { LoadError, Loading } from './ui';

const FILTERS: { v: NotificationStatus | ''; l: string }[] = [
  { v: '', l: 'الكل' }, { v: 'failed', l: 'فشل' }, { v: 'pending', l: 'بانتظار الإرسال' }, { v: 'sent', l: 'أُرسل' }, { v: 'skipped', l: 'لم يُرسل' },
];
const tone = (s: NotificationStatus) => (s === 'sent' ? 'complete' : s === 'failed' || s === 'skipped' ? 'waiting' : 'progress');

export function NotificationsManager() {
  const { notify } = useUi();
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [page, setPage] = useState(1);
  const list = useNotifications({ status: status || undefined, page });
  const resend = useResendNotification();
  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1;
  return (
    <>
      <div className="workspace-toolbar">
        <div className="segmented">
          {FILTERS.map((f) => <button key={f.v} className={status === f.v ? 'selected' : ''} onClick={() => { setStatus(f.v); setPage(1); }}>{f.l}</button>)}
        </div>
        <Link className="button secondary" href="/admin/settings#alerts"><Settings size={16} />بريد التنبيهات</Link>
      </div>
      <div className="design-tip"><Mail size={18} /><span>التنبيه يُحفظ مع الطلب نفسه ثم يُرسل في الخلفية. فشل البريد لا يؤثر على الطلب، ويُعاد تلقائيًا حتى 6 محاولات ثم ينتظر إعادة يدوية.</span></div>
      <section className="table-panel">
        {list.isLoading ? <Loading /> : list.isError ? <LoadError error={list.error} retry={() => list.refetch()} /> : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>التنبيه</th><th>الحالة</th><th>المحاولات</th><th>آخر خطأ</th><th>التاريخ</th><th /></tr></thead>
                <tbody>
                  {data!.results.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <b>{n.kind_label}</b>
                        <small className="muted" style={{ display: 'block' }}>
                          {n.order ? <Link href={`/admin/orders?open=${n.order}`} dir="ltr">{n.order_code}</Link> : n.inquiry ? <Link href={`/admin/messages?open=${n.inquiry}`}>رسالة #{n.inquiry}</Link> : null}
                          {n.recipients.length ? ` · ${n.recipients.join('، ')}` : ''}
                        </small>
                      </td>
                      <td><span className={'badge ' + tone(n.status)}><i />{n.status_label}</span>
                        {n.status === 'pending' && n.attempts > 0 && <small className="muted" style={{ display: 'block' }}><Clock3 size={11} /> التالية {formatDateTime(n.next_attempt_at)}</small>}</td>
                      <td>{n.attempts}</td>
                      <td className="muted" title={n.last_error} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.last_error || '—'}</td>
                      <td className="muted">{formatDateTime(n.sent_at || n.created_at)}</td>
                      <td>
                        {n.status !== 'sent' && n.status !== 'sending' && (
                          <button className="button secondary" disabled={resend.isPending} onClick={() => resend.mutate(n.id, {
                            onSuccess: (r) => notify(r.sent_now ? 'أُرسل التنبيه.' : `تعذّر الإرسال: ${r.last_error}`),
                            onError: (e) => notify(e.message),
                          })}><RotateCw size={14} />إعادة الإرسال</button>
                        )}
                        {n.status === 'sent' && <CheckCircle2 size={18} aria-label="أُرسل" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data!.results.length && <div className="compact-empty"><Mail size={30} /><p>لا توجد تنبيهات هنا.</p></div>}
            {pages > 1 && (
              <div className="pagination">
                <button className="button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
                <span className="subtle-copy">صفحة {page} من {pages}</span>
                <button className="button secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>التالي</button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export function AlertsBanner({ failed, skipped }: { failed: number; skipped: number }) {
  if (!failed && !skipped) return null;
  return (
    <div className="admin-note warn" role="status">
      <AlertTriangle size={21} />
      <div>
        <b>{failed ? `${failed} تنبيه بريد فشل إرساله` : `${skipped} تنبيه لم يُرسل لعدم ضبط بريد مستلم`}</b>
        <p>الطلبات محفوظة. <Link href={failed ? '/admin/notifications' : '/admin/settings#alerts'}>{failed ? 'راجع التنبيهات وأعد الإرسال' : 'اضبط بريد التنبيهات'}</Link>.</p>
      </div>
    </div>
  );
}
