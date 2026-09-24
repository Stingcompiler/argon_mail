import { Search } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'الصفحة غير موجودة', robots: { index: false } };

export default function NotFound() {
  return (
    <main className="container centered-page">
      <Search size={40} />
      <h1>لم نجد هذه الصفحة.</h1>
      <p>ربما تغيّر الرابط أو لم تعد الخدمة متاحة.</p>
      <Link className="button" href="/services">تصفح الخدمات</Link>
      <Link className="back-link" href="/">العودة إلى الرئيسية</Link>
    </main>
  );
}
