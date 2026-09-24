'use client';
import { PageHeading } from '@/components/admin/AdminShell';
import { TeamManager } from '@/components/admin/TeamManager';

export default function TeamPage() {
  return <><PageHeading title="فريقك، مساحة إنجازك." /><TeamManager /></>;
}
