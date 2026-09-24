'use client';
import { RotateCw } from 'lucide-react';

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="container centered-page" role="alert">
      <h1>تعذّر عرض الصفحة الآن.</h1>
      <p>حدث خطأ مؤقت. أعد المحاولة بعد لحظات.</p>
      <button className="button" onClick={reset}><RotateCw size={17} /> إعادة المحاولة</button>
    </section>
  );
}
