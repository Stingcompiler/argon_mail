'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { NotificationsManager } from '@/components/admin/NotificationsManager';

export default function NotificationsPage() {
  return <><PageHeading title="ابقَ على اطلاع." text="سجل تنبيهات البريد للطلبات والرسائل الجديدة، مع إعادة الإرسال عند الفشل." /><NotificationsManager /></>;
}
