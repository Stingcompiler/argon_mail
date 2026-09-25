'use client';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { QueryProvider } from './QueryProvider';

/** Admin only. QueryClient → Auth (needs the client). The toast provider lives
 * in the root layout, shared with the public site. */
export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
