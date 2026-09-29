'use client';
import { ArrowLeft, Check, CheckCheck, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUi } from '@/contexts/UiContext';
import { RememberCode } from './RememberCode';

export function OrderSuccess() {
  const code = useSearchParams().get('code') || '';
  const router = useRouter();
  // Opened without an order number (typed or bookmarked): nothing to show here.
  useEffect(() => { if (!code) router.replace('/track'); }, [code, router]);
  const { notify } = useUi();
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="success-icon"><CheckCheck size={35} strokeWidth={1.5} /><span className="burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</span></div>
      <span className="eyebrow">خطوة أولى مكتملة</span>
      <h1>وصل طلبك.</h1>
      <p>احتفظ برقم المتابعة لتعرف حالة طلبك في أي وقت ومن أي جهاز. من يحمل الرقم يستطيع رؤية الحالة فقط.</p>
      <div className="ticket">
        <span>رقم المتابعة الخاص بك</span>
        <strong dir="ltr">{code || '—'}</strong>
        <button className="text-button" onClick={async () => {
          try { await navigator.clipboard.writeText(code); setCopied(true); } catch { notify('يمكنك تحديد الرقم ونسخه يدويًا'); }
        }}>
          {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'تم نسخ الرقم' : 'نسخ رقم الطلب'}
        </button>
      </div>
      <RememberCode />
      <Link className="button" href={`/track?code=${encodeURIComponent(code)}`}>متابعة طلبي <ArrowLeft size={17} /></Link>
      <Link className="back-link" href="/">العودة إلى الرئيسية</Link>
    </>
  );
}
