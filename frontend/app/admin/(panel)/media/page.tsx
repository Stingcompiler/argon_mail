'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export default function MediaPage() {
  return <><PageHeading title="مكتبة الوسائط" text="صور الخدمات والشعار والمقدمة." /><MediaLibrary /></>;
}
