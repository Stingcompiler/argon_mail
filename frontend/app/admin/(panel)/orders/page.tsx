'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { OrdersPanel } from '@/components/admin/OrdersPanel';

export default function OrdersPage() {
  return (
    <>
      <PageHeading title="الطلبات" text="افتح الطلب لتحديث حالته وإسناده وملاحظاته." />
      <OrdersPanel />
    </>
  );
}
