'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { PagesManager } from '@/components/admin/PagesManager';

export default function PagesPage() {
  return <><PageHeading title="الصفحات" text="الخصوصية والشروط وأي صفحة تضيفها." /><PagesManager /></>;
}
