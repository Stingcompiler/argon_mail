'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { ServicesManager } from '@/components/admin/ServicesManager';

export default function ServicesPage() {
  return (
    <>
      <PageHeading title="خدمات تتسع لاحتياجات عملائك." text="أنشئ الخدمات ونماذجها، وانشرها أو أخفها دون تعديل الكود." />
      <ServicesManager />
    </>
  );
}
