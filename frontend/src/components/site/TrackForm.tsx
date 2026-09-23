'use client';
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function TrackForm({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (value) router.push(`/track?code=${encodeURIComponent(value)}`);
  };
  return (
    <form className="track-form" onSubmit={submit} role="search">
      <div>
        <Search size={19} />
        <input aria-label="رقم الطلب" dir="ltr" placeholder="ARJ-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={20} />
      </div>
      <button className="button">تتبع الطلب <ArrowLeft size={17} /></button>
    </form>
  );
}
