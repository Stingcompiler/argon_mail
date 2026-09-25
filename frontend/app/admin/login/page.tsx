'use client';
import { ArrowRight, Leaf, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/components/admin/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { status, bootstrap } = useAuth(); // 'offline' just shows the form; login reports its own errors
  const router = useRouter();
  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => { if (status === 'authenticated') router.replace('/admin'); }, [status, router]);
  return (
    <main className="login-page">
      <div className="login-story">
        <Leaf size={40} />
        <span className="eyebrow">مساحة العمل · بريد عرجون</span>
        <h1>وراء كل إنجاز،<br />اهتمام بالتفاصيل.</h1>
        <p>خدماتك وطلبات عملائك وفريقك،<br />في مساحة واحدة تمنحك رؤية أوضح.</p>
        <div className="login-story-bottom"><ShieldCheck size={18} />دخول آمن بصلاحيات حسب الدور</div>
      </div>
      <div className="login-form-area">
        <Link className="back-link" href="/"><ArrowRight size={16} />العودة إلى الموقع</Link>
        <LoginForm onDone={() => router.replace('/admin')} />
      </div>
    </main>
  );
}
