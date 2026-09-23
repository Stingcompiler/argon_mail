'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { OrdersPanel } from '@/components/admin/OrdersPanel';

export default function OrdersPage() {
  return (
    <>
      <PageHeading title="كل طلب، وتفاصيله." text="ابحث وصفِّ وافتح الطلب لتحديث حالته وإسناده وإضافة الملاحظات." />
      <OrdersPanel />
    </>
  );
}
