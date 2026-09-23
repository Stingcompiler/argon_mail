import type { Metadata } from 'next';
import { PolicyPage } from '@/components/site/PolicyPage';

export const metadata: Metadata = { title: 'سياسة الخصوصية', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return <PolicyPage title="خصوصيتك تهمنا." items={[
    { title: 'بيانات الطلب', text: 'نجمع الاسم ورقم WhatsApp والتفاصيل اللازمة لتنفيذ الخدمة فقط، ويطّلع عليها فريق العمل المصرّح له.' },
    { title: 'متابعة الحالة', text: 'صفحة المتابعة تعرض حالة الطلب والملاحظات العامة فقط، ولا تعرض الاسم أو الهاتف أو تفاصيل الطلب أو الملاحظات الداخلية.' },
    { title: 'المرفقات والاحتفاظ', text: 'تُحدد مدة الاحتفاظ بالبيانات والمرفقات وتُعلن قبل التشغيل الفعلي.' },
  ]} />;
}
