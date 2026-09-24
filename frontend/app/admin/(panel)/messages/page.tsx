'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { MessagesManager } from '@/components/admin/MessagesManager';

export default function MessagesPage() {
  return <><PageHeading title="كل رسالة، تستحق الاهتمام." text="رسائل نموذج التواصل، مع الإسناد والحالة والملاحظات الداخلية." /><MessagesManager /></>;
}
