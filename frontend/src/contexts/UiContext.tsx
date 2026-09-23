'use client';
import { CircleHelp, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** UI-only state: toasts. Server data never goes here (see TanStack Query). */
type Ui = { notify: (message: string) => void };
const UiContext = createContext<Ui | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <UiContext.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status" aria-live="polite" key={toast.id}>
          <CircleHelp size={19} />
          {toast.message}
          <button aria-label="إغلاق" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}
