'use client';
import { RotateCw } from 'lucide-react';
import Link from 'next/link';

/** Catches errors in the site and dashboard layouts themselves (e.g. the site
 * settings could not be loaded), which (site)/error.tsx can't: Arabic page
 * with a retry instead of Next's default English one. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container centered-page" role="alert">
      <h1>تعذّر عرض الصفحة الآن.</h1>
      <p>حدث خطأ مؤقت في الخادم. أعد المحاولة بعد لحظات.</p>
      <button className="button" onClick={reset}><RotateCw size={17} /> إعادة المحاولة</button>
      <Link className="back-link" href="/">العودة إلى الرئيسية</Link>
    </main>
  );
}
