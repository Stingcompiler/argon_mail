'use client';
import { ArrowUpLeft, LoaderCircle, RotateCw, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { usePublicService } from '@/hooks/public';
import type { PublicService } from '@/lib/api/types';
import { iconFor } from '../icons';
import { OrderForm } from './OrderForm';
import { serviceHref } from './ServiceTile';

type Limits = { maxFileMb: number; maxFiles: number; maxTotalMb: number };

/**
 * Tapping a service tile opens its request form here instead of leaving the
 * page (docs/brand-redesign-plan.md). The tile stays a normal link: opening it
 * in a new tab, or without JavaScript, still reaches the service page.
 *
 * The open service lives in the URL (?service=slug), so the link can be shared
 * and the back button closes the dialog. A native modal <dialog> keeps focus
 * inside, Escape closes it, and focus returns to the tile. Closing with typed
 * details asks first.
 */
export function OrderDialog({ services, limits }: { services: PublicService[]; limits: Limits }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const slug = params.get('service');
  const summary = services.find((s) => s.slug === slug) || null;
  const detail = usePublicService(summary ? slug : null);
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const openedHere = useRef(false);
  const dirty = useRef(false);

  const urlWith = useCallback((service: string | null) => {
    const q = new URLSearchParams(window.location.search);
    if (service) q.set('service', service); else q.delete('service');
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  }, [pathname]);

  // Tiles on this page open the dialog (plain clicks only).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const tile = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a.service-tile[data-service]');
      if (!tile || !services.some((s) => s.slug === tile.dataset.service)) return;
      e.preventDefault();
      trigger.current = tile;
      openedHere.current = true;
      dirty.current = false;
      router.push(urlWith(tile.dataset.service!), { scroll: false });
    };
    // Capture phase: runs before next/link's own handler, which then sees the
    // click as handled and does not navigate.
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [router, services, urlWith]);

  // The URL decides: open for a known service, closed otherwise (back button).
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (summary && !d.open) d.showModal();
    if (!summary && d.open) {
      d.close();
      trigger.current?.focus();
    }
  }, [summary]);

  const close = useCallback(() => {
    if (dirty.current && !window.confirm('لديك تفاصيل لم تُرسل بعد. هل تريد إغلاق النموذج؟')) return;
    dirty.current = false;
    if (openedHere.current) { openedHere.current = false; router.back(); }
    else router.replace(urlWith(null), { scroll: false });
  }, [router, urlWith]);

  const Icon = iconFor(summary?.icon_key || '');
  return (
    <dialog ref={ref} className="order-dialog" aria-labelledby="order-dialog-title"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      {summary && (
        <div className="order-dialog-body">
          <header className="order-dialog-head">
            <span className="tile-icon" aria-hidden="true"><Icon size={24} strokeWidth={1.5} /></span>
            <div>
              <h2 id="order-dialog-title">{summary.name}</h2>
              <p>{summary.price_label}{summary.duration_text ? ` · ${summary.duration_text}` : ''}</p>
            </div>
            <button type="button" className="icon-button" aria-label="إغلاق نموذج الطلب" onClick={close}><X size={20} /></button>
          </header>
          {detail.isLoading && <div className="empty-state" role="status"><LoaderCircle className="spin" size={28} /><p>جارٍ تجهيز النموذج...</p></div>}
          {detail.isError && (
            <div className="empty-state" role="alert">
              <h3>تعذّر تحميل النموذج</h3>
              <p>{detail.error.message}</p>
              <button type="button" className="button secondary" onClick={() => detail.refetch()}><RotateCw size={16} />إعادة المحاولة</button>
              <Link className="text-button" href={serviceHref(summary.slug)}>افتح صفحة الخدمة <ArrowUpLeft size={16} /></Link>
            </div>
          )}
          {detail.data && (
            <>
              <details className="order-dialog-details">
                <summary>تفاصيل الخدمة ومتطلباتها</summary>
                <p className="preserve-lines">{detail.data.description}</p>
                {detail.data.requirements && <><h3>المتطلبات</h3><p className="preserve-lines">{detail.data.requirements}</p></>}
                <Link className="text-button" href={serviceHref(summary.slug)}>صفحة الخدمة كاملة <ArrowUpLeft size={16} /></Link>
              </details>
              <div onInput={() => { dirty.current = true; }}>
                <OrderForm service={detail.data} limits={limits} />
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
