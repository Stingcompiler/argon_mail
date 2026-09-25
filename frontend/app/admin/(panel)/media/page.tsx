'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export default function MediaPage() {
  return <><PageHeading title="تفاصيل مرئية، وهوية متكاملة." text="الصور العامة للخدمات والشعار والمقدمة." /><MediaLibrary /></>;
}
