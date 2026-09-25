'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { PagesManager } from '@/components/admin/PagesManager';

export default function PagesPage() {
  return <><PageHeading title="صفحاتك، بكلماتك." text="الخصوصية والشروط وأي صفحة تضيفها للموقع." /><PagesManager /></>;
}
