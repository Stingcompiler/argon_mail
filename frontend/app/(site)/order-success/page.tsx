import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderSuccess } from '@/components/site/OrderSuccess';

export const metadata: Metadata = { title: 'تم استلام طلبك', robots: { index: false, follow: false } };

export default function OrderSuccessPage() {
  return <section className="container centered-page"><Suspense><OrderSuccess /></Suspense></section>;
}
