'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { AppearanceManager } from '@/components/admin/AppearanceManager';

export default function AppearancePage() {
  return <><PageHeading title="موقعك، بترتيبك." text="روابط القائمة وترتيب أقسام الصفحة الرئيسية." /><AppearanceManager /></>;
}
