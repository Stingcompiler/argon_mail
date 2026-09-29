'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { NotificationsManager } from '@/components/admin/NotificationsManager';

export default function NotificationsPage() {
  return <><PageHeading title="تنبيهات البريد" text="سجل التنبيهات وإعادة الإرسال عند الفشل." /><NotificationsManager /></>;
}
