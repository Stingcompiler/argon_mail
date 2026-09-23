import type { OrderFilters } from './api/types';

/**
 * Hierarchical TanStack Query keys. Everything behind login lives under
 * ['admin'] so logout and session expiry can drop it in one call.
 */
export const qk = {
  admin: {
    all: ['admin'] as const,
    orders: {
      all: ['admin', 'orders'] as const,
      list: (f: OrderFilters) => ['admin', 'orders', 'list', f] as const,
      summary: ['admin', 'orders', 'summary'] as const,
      detail: (id: number) => ['admin', 'orders', 'detail', id] as const,
    },
    services: ['admin', 'services'] as const,
    categories: ['admin', 'categories'] as const,
    statuses: ['admin', 'statuses'] as const,
    staff: ['admin', 'staff'] as const,
    team: ['admin', 'team'] as const,
    inquiries: {
      all: ['admin', 'inquiries'] as const,
      list: (f: { q?: string; status?: string }) => ['admin', 'inquiries', 'list', f] as const,
    },
    settings: ['admin', 'settings'] as const,
    faq: ['admin', 'faq'] as const,
  },
  public: {
    track: (code: string) => ['public', 'track', code] as const,
  },
};
