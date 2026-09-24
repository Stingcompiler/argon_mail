import type { Metadata } from 'next';
import { PolicyPage } from '@/components/site/PolicyPage';

export const metadata: Metadata = { title: 'شروط الاستخدام', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return <PolicyPage title="شروط واضحة للتعامل." items={[
    { title: 'الخدمات المتاحة', text: 'يحدد صاحب المنصة الخدمات والأسعار والمتطلبات المنشورة في صفحة كل خدمة.' },
    { title: 'السعر وبدء التنفيذ', text: 'تعرض كل خدمة طريقة تسعيرها. تُستكمل تفاصيل السعر والموافقة مع المسؤول قبل بدء التنفيذ.' },
    { title: 'الإلغاء والاسترداد', text: 'تُحدد أحكام الإلغاء والاسترداد لكل خدمة وتُعتمد قبل بدء التشغيل الحقيقي.' },
  ]} />;
}
