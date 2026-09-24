'use client';
import { ArrowLeft, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';

export function LoginForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    try {
      await login(String(f.get('login')).trim(), String(f.get('password')));
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر تسجيل الدخول.');
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className={compact ? 'relogin-form' : undefined}>
      {!compact && <span className="login-icon"><LockKeyhole size={27} /></span>}
      <h2>{compact ? 'انتهت الجلسة' : 'أهلًا بعودتك.'}</h2>
      <p>{compact ? 'سجّل الدخول مجددًا لمتابعة عملك. لم تُفقد التعديلات المفتوحة.' : 'ادخل إلى مساحة إدارة بريد عرجون.'}</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <label>البريد الإلكتروني أو اسم المستخدم<input name="login" type="text" dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} /></label>
      <label>كلمة المرور<input name="password" type="password" dir="ltr" autoComplete="current-password" required /></label>
      <button className="button wide" disabled={pending}>
        {pending ? <>جارٍ الدخول <LoaderCircle className="spin" size={17} /></> : <>دخول <ArrowLeft size={17} /></>}
      </button>
    </form>
  );
}
