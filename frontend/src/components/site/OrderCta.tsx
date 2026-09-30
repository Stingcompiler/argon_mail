'use client';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reducedMotion } from '@/lib/motion';

/**
 * Phones: a floating «اطلب الخدمة» button while the order form is out of
 * view (it sits under the service details). It scrolls to the form and puts
 * the cursor in its first field, and hides once the form is on screen.
 */
export function OrderCta() {
  const [formVisible, setFormVisible] = useState(true);
  useEffect(() => {
    const form = document.getElementById('order-form');
    if (!form) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { rootMargin: '0px 0px -30% 0px' });
    io.observe(form);
    return () => io.disconnect();
  }, []);
  const go = () => {
    const form = document.getElementById('order-form');
    if (!form) return;
    form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => form.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true }), reducedMotion() ? 0 : 450);
  };
  return (
    <button type="button" className={'order-cta' + (formVisible ? ' is-hidden' : '')} aria-hidden={formVisible || undefined} tabIndex={formVisible ? -1 : 0} onClick={go}>
      اطلب الخدمة <ArrowLeft size={18} />
    </button>
  );
}
