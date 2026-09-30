'use client';
import { ArrowUpLeft, CheckCheck, Clock3, Inbox, MessageCircle, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { PageHeading } from '@/components/admin/AdminShell';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { AlertsBanner } from '@/components/admin/NotificationsManager';
import { useAuth } from '@/contexts/AuthContext';
import { useInquiries, useNotificationSummary, useOrderSummary } from '@/hooks/admin';
import { CountUp } from '@/lib/motion';

export default function Overview() {
  const summary = useOrderSummary();
  const { user } = useAuth();
  const alerts = useNotificationSummary(user?.role === 'admin' || user?.role === 'operator');
  const m = summary.data?.by_meaning || {};
  const inProgress = (m.in_review || 0) + (m.in_progress || 0) + (m.waiting_customer || 0) + (m.ready || 0);
  return (
    <>
      <PageHeading title="نظرة عامة" text="ملخص العمل وأحدث الطلبات." />
      {alerts.data && <AlertsBanner failed={alerts.data.failed} skipped={alerts.data.skipped} />}
      <div className="stats-grid">
        {[
          { name: 'إجمالي الطلبات', value: summary.data?.total, icon: Inbox },
          { name: 'طلبات جديدة', value: m.new || 0, icon: Sparkles },
          { name: 'قيد العمل', value: inProgress, icon: Clock3 },
          { name: 'طلبات مكتملة', value: m.completed || 0, icon: CheckCheck },
        ].map((s) => (
          <div className="stat" key={s.name}>
            <div><span>{s.name}</span><s.icon size={19} /></div>
            <strong><CountUp value={summary.isLoading ? null : s.value ?? 0} /></strong>
            <small>{summary.isError ? 'تعذّر التحميل' : 'بيانات حية'}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <NeedsAttention unassigned={summary.data?.unassigned_new} />
        <WeekChart days={summary.data?.last_7_days} />
      </div>
      <OrdersPanel compact />
      <div className="admin-note">
        <ShieldCheck size={21} />
        <div><b>معلومات العميل تبقى في مساحة الإدارة</b><p>صفحة المتابعة تعرض حالة الطلب وملاحظاتك العامة فقط.</p></div>
      </div>
    </>
  );
}

/** What someone should act on now; each row opens the matching filtered list. */
function NeedsAttention({ unassigned }: { unassigned?: number }) {
  const newMessages = useInquiries({ status: 'new' }).data?.count;
  const rows = [
    { href: '/admin/orders?assignee=none', icon: UserPlus, label: 'طلبات غير مسندة', hint: 'اختر مسؤولًا لكل طلب', count: unassigned },
    { href: '/admin/messages?status=new', icon: MessageCircle, label: 'رسائل جديدة', hint: 'لم يُرد عليها بعد', count: newMessages },
  ];
  const clear = rows.every((r) => r.count === 0);
  return (
    <section className="attention-panel" aria-labelledby="attention-title">
      <h2 id="attention-title">يحتاج انتباهك</h2>
      {clear ? <p className="attention-clear"><CheckCheck size={18} /> لا شيء ينتظرك الآن.</p> : (
        <ul>
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>
                <span className="attention-icon"><r.icon size={18} /></span>
                <span><b>{r.label}</b><small>{r.hint}</small></span>
                <strong className={r.count ? 'has-items' : ''}>{r.count ?? '…'}</strong>
                <ArrowUpLeft size={16} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const DAY = new Intl.DateTimeFormat('ar', { weekday: 'short' });

/** New orders per day for the last 7 days (CSS bars, no chart library). */
function WeekChart({ days }: { days?: { date: string; count: number }[] }) {
  const max = Math.max(1, ...(days || []).map((d) => d.count));
  const total = (days || []).reduce((n, d) => n + d.count, 0);
  const label = days ? `طلبات آخر 7 أيام: ${days.map((d) => `${DAY.format(new Date(d.date + "T12:00"))} ${d.count}`).join('، ')}` : 'جارٍ التحميل';
  return (
    <section className="week-chart" aria-labelledby="week-title">
      <div className="week-head"><h2 id="week-title">آخر 7 أيام</h2><b>{days ? total : '…'} طلب</b></div>
      <div className="week-bars" role="img" aria-label={label}>
        {(days || Array.from({ length: 7 }, (_, i) => ({ date: String(i), count: 0 }))).map((d, i) => (
          <div key={d.date} className={i === 6 ? 'today' : ''}>
            <span className="bar" style={{ ['--h' as string]: `${Math.round((d.count / max) * 100)}%` }} aria-hidden="true"><i>{d.count || ''}</i></span>
            <small aria-hidden="true">{days ? DAY.format(new Date(d.date + "T12:00")) : ''}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
