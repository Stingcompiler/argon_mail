'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { SettingsManager } from '@/components/admin/SettingsManager';

export default function SettingsPage() {
  return <><PageHeading title="صوت عرجون، بكلماتك." text="الهوية والتواصل ونصوص الرئيسية والأسئلة الشائعة." /><SettingsManager /></>;
}
