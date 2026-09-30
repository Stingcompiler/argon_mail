'use client';
import { ArrowLeft, ChevronLeft, FileText, Home, Info, Layers3, MessageCircle, Package, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { NavItem } from '@/lib/api/types';
import { TrackForm } from './TrackForm';

const ICONS: Record<string, typeof Home> = { '/': Home, '/services': Layers3, '/track': Package, '/contact': MessageCircle, '/about': Info };
const iconFor = (href: string) => ICONS[href] || FileText;

export function useIsActive() {
  const pathname = decodeURIComponent(usePathname());
  return (href: string) => { const h = decodeURIComponent(href); return h === '/' ? pathname === '/' : pathname.startsWith(h); };
}

/**
 * A bottom sheet's <dialog>, opened with showModal() when `open` turns true.
 * Its contents render only from the first opening on: closed sheets are on
 * every page, and their ~70 elements were parsed and hydrated on each load
 * without ever being seen (home page performance). `onShown` runs once the
 * dialog is open, for example to focus a field.
 */
function useSheet(open: boolean, onShown?: (d: HTMLDialogElement) => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && mounted && !d.open) { d.showModal(); onShown?.(d); }
    if (!open && d.open) d.close();
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ref, mounted };
}

/**
 * Full navigation as a bottom sheet (phones and tablets). A native <dialog>
 * opened with showModal(): the page behind is inert, focus stays inside,
 * Escape closes it, and focus returns to the menu button.
 */
export function NavSheet({ open, onClose, nav, whatsapp }: { open: boolean; onClose: () => void; nav: NavItem[]; whatsapp?: string }) {
  const { ref, mounted } = useSheet(open);
  const active = useIsActive();
  return (
    // A click on the dialog itself (not its content) is a click on the backdrop;
    // keyboard users close it with Escape or the close button.
    <dialog ref={ref} className="nav-sheet" aria-label="القائمة" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {mounted && <div className="nav-sheet-body">
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
          <Link className="button" href="/track" onClick={onClose}><Package size={18} />تتبع طلبك</Link>
          {whatsapp && <a className="button secondary" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />واتساب</a>}
        </div>
        <div className="nav-sheet-legal">
          <Link href="/privacy" onClick={onClose}>سياسة الخصوصية</Link><span aria-hidden="true">·</span><Link href="/terms" onClick={onClose}>شروط الاستخدام</Link>
        </div>
      </div>}
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

/**
 * The tracking code field as a bottom sheet, opened from the tab bar so a
 * returning customer never leaves the page they are on (audit plan, batch 1).
 * Same native <dialog> mechanics as the menu sheet; the form navigates to
 * /track?code=… on submit, and the name-and-phone lookup stays a link.
 */
function TrackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Focus the field, not the close button.
  const { ref, mounted } = useSheet(open, (d) => d.querySelector('input')?.focus());
  return (
    <dialog ref={ref} className="nav-sheet track-sheet" aria-label="تتبع طلبك" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {mounted && <div className="nav-sheet-body">
        <span className="sheet-handle" aria-hidden="true" />
        <div className="nav-sheet-head">
          <b>تتبع طلبك</b>
          <button type="button" className="icon-button" aria-label="إغلاق" onClick={onClose}><X size={20} /></button>
        </div>
        <p>أدخل رقم الطلب الذي يبدأ بـ ARJ-.</p>
        <TrackForm compact />
        <Link className="text-button" href="/track" onClick={onClose}>نسيت الرقم؟ ابحث باسمك ورقم هاتفك <ArrowLeft size={16} /></Link>
      </div>}
    </dialog>
  );
}

/** App-style bottom bar on phones: the four places customers go most. */
export function TabBar() {
  const active = useIsActive();
  const pathname = usePathname();
  const [trackOpen, setTrackOpen] = useState(false);
  const trackTab = useRef<HTMLAnchorElement>(null);
  useEffect(() => setTrackOpen(false), [pathname]);
  // Focus goes back to the tab that opened the sheet (a tapped link is not
  // always the focused element, so the dialog cannot restore it by itself).
  const closeTrack = () => { setTrackOpen(false); (document.activeElement as HTMLElement | null)?.blur?.(); trackTab.current?.focus(); };
  useFocusClearOfBars();
  const tabs = [
    { href: '/', label: 'الرئيسية', icon: Home },
    { href: '/services', label: 'الخدمات', icon: Layers3 },
    { href: '/track', label: 'تتبع طلبك', icon: Package },
    { href: '/contact', label: 'تواصل', icon: MessageCircle },
  ];
  return (
    <nav className="tab-bar" aria-label="التنقل السريع">
      {tabs.map((t) => {
        const on = active(t.href);
        // «تتبع طلبك» opens the code field in a sheet; without JavaScript, or
        // already on the tracking page, the link works as a link.
        const onClick = t.href === '/track' && !on ? (e: React.MouseEvent) => { e.preventDefault(); setTrackOpen(true); } : undefined;
        return (
          <Link key={t.href} href={t.href} ref={t.href === '/track' ? trackTab : undefined} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined} onClick={onClick}>
            <span className="tab-icon"><t.icon size={21} strokeWidth={on ? 2.2 : 1.8} /></span>
            <span className="tab-label">{t.label}</span>
          </Link>
        );
      })}
      <TrackSheet open={trackOpen} onClose={closeTrack} />
    </nav>
  );
}
