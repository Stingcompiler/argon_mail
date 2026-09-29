'use client';
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

/**
 * A plain GET form to /track?code=…, so it works before the page hydrates
 * (or without JavaScript); once hydrated it navigates client-side instead.
 */
export function TrackForm({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('code') || '').trim().toUpperCase();
    if (!value) return;
    router.push(`/track?code=${encodeURIComponent(value)}`);
  };
  return (
    <form className="track-form" action="/track" onSubmit={submit} role="search">
      <div>
        <Search size={19} />
        <input name="code" aria-label="رقم الطلب" dir="ltr" placeholder="ARJ-XXXXXXXX" defaultValue={initial} required maxLength={20} />
      </div>
      <button className="button">تتبع الطلب <ArrowLeft size={17} /></button>
    </form>
  );
}
