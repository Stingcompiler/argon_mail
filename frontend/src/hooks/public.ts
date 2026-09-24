'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Tracking } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';

export function useTracking(code: string) {
  return useQuery({
    queryKey: qk.public.track(code),
    queryFn: ({ signal }) => api<Tracking>(`/public/track/${encodeURIComponent(code)}/`, { auth: false, signal }),
    enabled: code.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export type OrderInput = {
  service: string; customer_name: string; customer_phone: string;
  answers: Record<string, string | string[]>; details: string; consent: boolean;
};

export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ key, ...body }: OrderInput & { key: string }) =>
      api<{ code: string; service_name: string; created_at: string }>('/public/orders/', { method: 'POST', body, auth: false, idempotencyKey: key }),
  });
}

export function useCreateInquiry() {
  return useMutation({
    mutationFn: ({ key, ...body }: { key: string; name: string; phone: string; subject: string; body: string }) =>
      api<{ id: number }>('/public/inquiries/', { method: 'POST', body, auth: false, idempotencyKey: key }),
  });
}
