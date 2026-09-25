'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { StatusesManager } from '@/components/admin/StatusesManager';

export default function StatusesPage() {
  return <><PageHeading title="كل خطوة، بوضوح." text="أسماء حالات الطلب وترتيبها وتفعيلها." /><StatusesManager /></>;
}
