'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Id of a field's error message, referenced by the field's aria-describedby. */
export const errorId = (name: string) => `${name.replace(/[^\w-]/g, '_')}-error`;

/** Joins the ids that exist, or undefined so the attribute is left out. */
export const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

/**
 * After a failed submit, moves focus to the first field marked
 * aria-invalid, so keyboard and screen-reader users land on the problem and
 * hear its message (through aria-describedby). Call `focusInvalid()` where
 * the errors are set; the focus happens after React renders them.
 */
export function useFocusInvalid<T extends HTMLElement = HTMLFormElement>() {
  const ref = useRef<T>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!tick) return;
    const el = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    const target = el.matches('input,select,textarea') ? el : el.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea');
    (target || el).focus();
  }, [tick]);
  const focusInvalid = useCallback(() => setTick((t) => t + 1), []);
  return [ref, focusInvalid] as const;
}

export function FieldError({ name, error, live = false }: { name: string; error?: string; live?: boolean }) {
  if (!error) return null;
  // Errors shown after submit are read through focus + aria-describedby; only
  // errors that appear without a submit (a rejected file) announce themselves.
  return <small id={errorId(name)} className="field-error" role={live ? 'alert' : undefined}>{error}</small>;
}
