'use client';
import { LoaderCircle, RotateCw, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ApiError } from '@/lib/api/client';

/** Focus trap + Escape for dialogs (from the approved preview). */
export function useDialogFocus(open: boolean, onClose: () => void, selector = '[role="dialog"]') {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(selector);
    if (!dialog) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const selectors = 'a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]';
    const visible = () => Array.from(dialog.querySelectorAll<HTMLElement>(selectors)).filter((el) => el.offsetParent !== null);
    visible()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = visible();
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [open, selector]);
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className={'toggle ' + (checked ? 'on' : '')} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function SectionTitle({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="section-title">
      <span><Icon size={21} /></span>
      <div><h2>{title}</h2><p>{text}</p></div>
    </div>
  );
}

export function Loading({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return <div className="compact-empty" role="status"><LoaderCircle className="spin" size={28} /><p>{label}</p></div>;
}

export function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  const denied = error instanceof ApiError && error.status === 403;
  return (
    <div className="compact-empty" role="alert">
      <h3>{denied ? 'ليست لديك صلاحية لعرض هذا القسم.' : 'تعذّر تحميل البيانات.'}</h3>
      {!denied && <><p>{error instanceof Error ? error.message : ''}</p><button className="button secondary" onClick={retry}><RotateCw size={16} /> إعادة المحاولة</button></>}
    </div>
  );
}

export function StatusBadge({ meaning, label }: { meaning: string; label: string }) {
  const tone = meaning === 'completed' ? 'complete' : meaning === 'new' ? 'new' : meaning === 'waiting_customer' ? 'waiting' : 'progress';
  return <span className={'badge ' + tone}><i />{label}</span>;
}

export const roleLabel = { admin: 'مدير', operator: 'مشغّل', executor: 'منفذ' } as const;
