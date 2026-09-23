'use client';
import { CheckCheck, Clock3, Inbox, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeading } from '@/components/admin/AdminShell';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { AlertsBanner } from '@/components/admin/NotificationsManager';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationSummary, useOrderSummary } from '@/hooks/admin';

export default function Overview() {
  const summary = useOrderSummary();
  const { user } = useAuth();
  const alerts = useNotificationSummary(user?.role === 'admin' || user?.role === 'operator');
  const m = summary.data?.by_meaning || {};
  const inProgress = (m.in_review || 0) + (m.in_progress || 0) + (m.waiting_customer || 0) + (m.ready || 0);
  return (
    <>
      <PageHeading title="أهلًا بك، يوم جديد للإنجاز." text="تابع العمل، واهتم بالتفاصيل التي تصنع تجربة أفضل." />
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
            <strong>{summary.isLoading ? '…' : String(s.value ?? 0).padStart(2, '0')}</strong>
            <small>{summary.isError ? 'تعذّر التحميل' : 'بيانات حية'}</small>
          </div>
        ))}
      </div>
      <OrdersPanel compact />
      <div className="admin-note">
        <ShieldCheck size={21} />
        <div><b>معلومات العميل تبقى في مساحة الإدارة</b><p>صفحة المتابعة تعرض حالة الطلب وملاحظاتك العامة فقط.</p></div>
      </div>
    </>
  );
}
