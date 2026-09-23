'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { AuthProvider } from './AuthContext';
import { UiProvider } from './UiContext';

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

/** Order matters: QueryClient → Auth (needs the client) → UI. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <UiProvider>{children}</UiProvider>
      </AuthProvider>
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
