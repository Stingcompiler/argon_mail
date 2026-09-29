'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { StatusesManager } from '@/components/admin/StatusesManager';

export default function StatusesPage() {
  return <><PageHeading title="حالات الطلب" text="أسماء الحالات وترتيبها وتفعيلها." /><StatusesManager /></>;
}
