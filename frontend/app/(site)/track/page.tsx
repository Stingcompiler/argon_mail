import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrackingView } from '@/components/site/TrackingView';
import { QueryProvider } from '@/contexts/QueryProvider';

export const metadata: Metadata = { title: 'متابعة الطلب', robots: { index: false, follow: false } };

export default function TrackPage() {
  return (
    <section className="container tracking-page">
      <div className="page-intro">
        <span className="eyebrow">معك، في كل خطوة</span>
        <h1>اطمئن على طلبك.</h1>
        <p>تابع برقم الطلب، أو باسمك الكامل ورقم WhatsApp الذي استخدمته.</p>
      </div>
      <QueryProvider><Suspense><TrackingView /></Suspense></QueryProvider>
    </section>
  );
}
