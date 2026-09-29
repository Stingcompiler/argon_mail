'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { MessagesManager } from '@/components/admin/MessagesManager';

export default function MessagesPage() {
  return <><PageHeading title="الرسائل" text="رسائل نموذج التواصل وحالتها." /><MessagesManager /></>;
}
