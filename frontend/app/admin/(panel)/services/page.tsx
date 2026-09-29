'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { ServicesManager } from '@/components/admin/ServicesManager';

export default function ServicesPage() {
  return (
    <>
      <PageHeading title="الخدمات والمجالات" text="الخدمات ونماذجها ونشرها." />
      <ServicesManager />
    </>
  );
}
