import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function PolicyPage({ title, items }: { title: string; items: { title: string; text: string }[] }) {
  return (
    <section className="container policy-page">
      <span className="eyebrow">وضوح من أول خطوة</span>
      <h1>{title}</h1>
      <div className="notice">مسودة توضيحية. يعتمد صاحب المنصة النص النهائي قبل الإطلاق.</div>
      {items.map((x) => <article key={x.title}><h2>{x.title}</h2><p>{x.text}</p></article>)}
      <Link className="text-button" href="/contact">تواصل معنا <ArrowLeft size={17} /></Link>
    </section>
  );
}
