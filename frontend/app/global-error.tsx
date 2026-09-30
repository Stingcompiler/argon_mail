'use client';
import './globals.css';

/** Last resort when the root layout itself fails. It replaces the whole
 * document, so it brings its own <html> and <body>. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="container centered-page" role="alert">
          <h1>تعذّر عرض الصفحة الآن.</h1>
          <p>حدث خطأ مؤقت. أعد المحاولة بعد لحظات.</p>
          <button className="button" onClick={reset}>إعادة المحاولة</button>
          <a className="back-link" href="/">العودة إلى الرئيسية</a>
        </main>
      </body>
    </html>
  );
}
