import { BookmarkCheck } from 'lucide-react';

/** Reminder shown wherever a tracking code is displayed or needed. */
export function RememberCode({ compact = false }: { compact?: boolean }) {
  return (
    <div className="remember-code" role="note">
      <BookmarkCheck size={20} aria-hidden="true" />
      <div>
        <b>احتفظ برقم طلبك.</b>
        {!compact && <p>انسخه أو التقط صورة له. هو أسرع طريقة لمتابعة طلبك من أي جهاز.</p>}
        <p>إن نسيته، يمكنك المتابعة باسمك الكامل ورقم WhatsApp الذي استخدمته في الطلب.</p>
      </div>
    </div>
  );
}
