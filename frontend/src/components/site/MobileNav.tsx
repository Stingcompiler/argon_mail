'use client';
import { ChevronLeft, FileText, Home, Info, Layers3, MessageCircle, Package, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { NavItem } from '@/lib/api/types';

const ICONS: Record<string, typeof Home> = { '/': Home, '/services': Layers3, '/track': Package, '/contact': MessageCircle, '/about': Info };
const iconFor = (href: string) => ICONS[href] || FileText;

export function useIsActive() {
  const pathname = decodeURIComponent(usePathname());
  return (href: string) => { const h = decodeURIComponent(href); return h === '/' ? pathname === '/' : pathname.startsWith(h); };
}

/**
 * Full navigation as a bottom sheet (phones and tablets). A native <dialog>
 * opened with showModal(): the page behind is inert, focus stays inside,
 * Escape closes it, and focus returns to the menu button.
 */
export function NavSheet({ open, onClose, nav, whatsapp }: { open: boolean; onClose: () => void; nav: NavItem[]; whatsapp?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const active = useIsActive();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    // A click on the dialog itself (not its content) is a click on the backdrop;
    // keyboard users close it with Escape or the close button.
    <dialog ref={ref} className="nav-sheet" aria-label="القائمة" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nav-sheet-body">
        <span className="sheet-handle" aria-hidden="true" />
        <div className="nav-sheet-head">
          <b>القائمة</b>
          <button type="button" className="icon-button" aria-label="إغلاق القائمة" onClick={onClose}><X size={20} /></button>
        </div>
        <nav aria-label="كل الصفحات">
          {nav.map((n) => {
            const Icon = iconFor(n.href);
            const on = active(n.href);
            return (
              <Link key={n.href} href={n.href} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined} onClick={onClose}>
                <span className="nav-sheet-icon"><Icon size={19} /></span>{n.label}<ChevronLeft className="chev" size={17} />
              </Link>
            );
          })}
        </nav>
        <div className="nav-sheet-actions">
          <Link className="button" href="/track" onClick={onClose}><Package size={18} />تابع طلبك</Link>
          {whatsapp && <a className="button secondary" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />واتساب</a>}
        </div>
        <div className="nav-sheet-legal">
          <Link href="/privacy" onClick={onClose}>سياسة الخصوصية</Link><span aria-hidden="true">·</span><Link href="/terms" onClick={onClose}>شروط الاستخدام</Link>
        </div>
      </div>
    </dialog>
  );
}

/**
 * WCAG 2.4.11: browsers only scroll a focused element into view when it is
 * outside the viewport, not when it sits under a sticky header or the tab bar.
 * Nudge the page just enough to bring it clear of whichever bar is showing.
 */
function useFocusClearOfBars() {
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.getBoundingClientRect || el.closest('header, .tab-bar, dialog')) return;
      const shown = (sel: string) => {
        const bar = document.querySelector<HTMLElement>(sel);
        if (!bar || !bar.getClientRects().length || getComputedStyle(bar).visibility === 'hidden') return null;
        return bar.getBoundingClientRect();
      };
      const box = el.getBoundingClientRect();
      const header = getComputedStyle(document.querySelector('header') || document.body).position === 'sticky' ? shown('header') : null;
      const tabs = shown('.tab-bar');
      const gap = 12;
      if (tabs && box.bottom > tabs.top) window.scrollBy({ top: box.bottom - tabs.top + gap, behavior: 'instant' });
      else if (header && box.top < header.bottom) window.scrollBy({ top: box.top - header.bottom - gap, behavior: 'instant' });
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);
}

/** App-style bottom bar on phones: the four places customers go most. */
export function TabBar() {
  const active = useIsActive();
  useFocusClearOfBars();
  const tabs = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/services', label: 'الخدمات', icon: Layers3 },
    { href: '/track', label: 'تابع طلبك', icon: Package },
    { href: '/contact', label: 'تواصل', icon: MessageCircle },
  ];
  return (
    <nav className="tab-bar" aria-label="التنقل السريع">
      {tabs.map((t) => {
        const on = active(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined}>
            <span className="tab-icon"><t.icon size={21} strokeWidth={on ? 2.2 : 1.8} /></span>
            <span className="tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
