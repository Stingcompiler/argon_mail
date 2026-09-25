'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';

const Devtools = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools), { ssr: false })
  : () => null;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Never retry client errors (401/403/404/400); retry network/5xx twice.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Mounted only where it is needed: the admin layout, and the few public pages
 * with a form or a live lookup (service, track, contact). Home, services list,
 * about and policy pages are pure server HTML and don't download TanStack Query.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      {children}
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
