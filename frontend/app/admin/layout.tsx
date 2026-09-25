import type { Metadata } from 'next';
import { AdminProviders } from '@/contexts/Providers';

export const metadata: Metadata = { title: 'لوحة التحكم', robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
