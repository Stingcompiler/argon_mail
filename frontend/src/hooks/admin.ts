'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  AdminNotification, Currency, Payment, PaymentStatus, StorageStatus,
  AdminService, AdminServiceInput, Category, FAQItem, Inquiry, InquiryStatus, OrderDetail, OrderFilters,
  OrderListItem, OrderStatus, Paginated, SiteSettings, User, UserBrief,
} from '@/lib/api/types';
import { qk } from '@/lib/query-keys';

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ---------- orders ----------
export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: qk.admin.orders.list(filters),
    queryFn: ({ signal }) => api<Paginated<OrderListItem>>(`/admin/orders/${qs(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useOrderSummary() {
  return useQuery({
    queryKey: qk.admin.orders.summary,
    queryFn: ({ signal }) => api<{ total: number; by_meaning: Record<string, number> }>('/admin/orders/summary/', { signal }),
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: qk.admin.orders.detail(id ?? 0),
    queryFn: ({ signal }) => api<OrderDetail>(`/admin/orders/${id}/`, { signal }),
    enabled: id !== null,
  });
}

/** Status, assignment and notes all return the full order; the cache is
 * updated in place and lists/summary are invalidated. */
export function useOrderActions(id: number) {
  const client = useQueryClient();
  const onSuccess = (order: OrderDetail) => {
    client.setQueryData(qk.admin.orders.detail(id), order);
    client.invalidateQueries({ queryKey: qk.admin.orders.all, predicate: (q) => q.queryKey[2] !== 'detail' });
  };
  return {
    changeStatus: useMutation({
      mutationFn: (v: { status: string; public_note?: string }) =>
        api<OrderDetail>(`/admin/orders/${id}/status/`, { method: 'POST', body: v }),
      onSuccess,
    }),
    assign: useMutation({
      mutationFn: (assignee: number | null) => api<OrderDetail>(`/admin/orders/${id}/assign/`, { method: 'POST', body: { assignee } }),
      onSuccess,
    }),
    addNote: useMutation({
      mutationFn: (v: { body: string; visibility: 'public' | 'internal' }) =>
        api<OrderDetail>(`/admin/orders/${id}/notes/`, { method: 'POST', body: v }),
      onSuccess,
    }),
    upload: useMutation({
      mutationFn: (v: { file: File; kind: 'order_document' | 'payment_proof'; payment?: number }) => {
        const form = new FormData();
        form.append('file', v.file, v.file.name);
        form.append('kind', v.kind);
        if (v.payment) form.append('payment', String(v.payment));
        return api<OrderDetail>(`/admin/orders/${id}/attachments/`, { method: 'POST', body: form });
      },
      onSuccess,
    }),
    createQuote: useMutation({
      mutationFn: (v: { amount: string; currency: Currency; note: string }) =>
        api<OrderDetail>(`/admin/orders/${id}/quotes/`, { method: 'POST', body: v }),
      onSuccess,
    }),
    decideQuote: useMutation({
      mutationFn: ({ quoteId, ...v }: { quoteId: number; decision: 'accepted' | 'rejected'; note: string }) =>
        api<OrderDetail>(`/admin/orders/${id}/quotes/${quoteId}/decision/`, { method: 'POST', body: v }),
      onSuccess,
    }),
    setPaymentStatus: useMutation({
      mutationFn: (v: { payment_status: PaymentStatus; note?: string }) =>
        api<OrderDetail>(`/admin/orders/${id}/payment-status/`, { method: 'POST', body: v }),
      onSuccess,
    }),
    recordPayment: useMutation({
      mutationFn: (v: { amount: string; currency: Currency; method: Payment['method']; reference: string; note: string }) =>
        api<OrderDetail>(`/admin/orders/${id}/payments/`, { method: 'POST', body: v }),
      onSuccess,
    }),
  };
}

/** Asks for a 5-minute signed link, then lets the browser download it. */
export function useDownloadAttachment(orderId: number) {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const { url } = await api<{ url: string; expires_in: number }>(`/admin/orders/${orderId}/attachments/${fileId}/link/`, { method: 'POST' });
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  });
}

export function useStorage(enabled: boolean) {
  return useQuery({ queryKey: qk.admin.storage, queryFn: ({ signal }) => api<StorageStatus>('/admin/storage/', { signal }), enabled, staleTime: 5 * 60_000 });
}

export function useStatuses() {
  return useQuery({ queryKey: qk.admin.statuses, queryFn: ({ signal }) => api<OrderStatus[]>('/admin/statuses/', { signal }), staleTime: 5 * 60_000 });
}

export function useStaff() {
  return useQuery({ queryKey: qk.admin.staff, queryFn: ({ signal }) => api<UserBrief[]>('/admin/staff/', { signal }), staleTime: 5 * 60_000 });
}

// ---------- services & categories ----------
export function useServices(enabled = true) {
  return useQuery({ queryKey: qk.admin.services, queryFn: ({ signal }) => api<AdminService[]>('/admin/services/', { signal }), enabled });
}

export function useSaveService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: AdminServiceInput) =>
      id ? api<AdminService>(`/admin/services/${id}/`, { method: 'PATCH', body }) : api<AdminService>('/admin/services/', { method: 'POST', body }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.admin.services });
      client.invalidateQueries({ queryKey: qk.admin.categories });
    },
  });
}

/** Optimistic publish/hide toggle with rollback on failure. */
export function useSetServiceStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminService['status'] }) =>
      api<AdminService>(`/admin/services/${id}/`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      await client.cancelQueries({ queryKey: qk.admin.services });
      const previous = client.getQueryData<AdminService[]>(qk.admin.services);
      client.setQueryData<AdminService[]>(qk.admin.services, (list) => list?.map((s) => (s.id === id ? { ...s, status } : s)));
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) client.setQueryData(qk.admin.services, ctx.previous); },
    onSettled: () => client.invalidateQueries({ queryKey: qk.admin.services }),
  });
}

export function useDeleteService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/admin/services/${id}/`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.admin.services }),
  });
}

export function useCategories() {
  return useQuery({ queryKey: qk.admin.categories, queryFn: ({ signal }) => api<Category[]>('/admin/categories/', { signal }) });
}

export function useCategoryActions() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: qk.admin.categories });
  return {
    create: useMutation({ mutationFn: (name: string) => api<Category>('/admin/categories/', { method: 'POST', body: { name } }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: number) => api<void>(`/admin/categories/${id}/`, { method: 'DELETE' }), onSuccess: done }),
  };
}

// ---------- inquiries ----------
export function useInquiries(f: { q?: string; status?: string }) {
  return useQuery({
    queryKey: qk.admin.inquiries.list(f),
    queryFn: ({ signal }) => api<Paginated<Inquiry>>(`/admin/inquiries/${qs(f)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateInquiry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: InquiryStatus; internal_note?: string; assignee_id?: number | null }) =>
      api<Inquiry>(`/admin/inquiries/${id}/`, { method: 'PATCH', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.admin.inquiries.all }),
  });
}

// ---------- settings, FAQ, team ----------
export function useSiteSettings() {
  return useQuery({ queryKey: qk.admin.settings, queryFn: ({ signal }) => api<SiteSettings>('/admin/settings/', { signal }) });
}

export function useSaveSiteSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SiteSettings>) => api<SiteSettings>('/admin/settings/', { method: 'PATCH', body }),
    onSuccess: (data) => client.setQueryData(qk.admin.settings, data),
  });
}

export function useFaq() {
  return useQuery({ queryKey: qk.admin.faq, queryFn: ({ signal }) => api<FAQItem[]>('/admin/faq/', { signal }) });
}

export function useFaqActions() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: qk.admin.faq });
  return {
    save: useMutation({
      mutationFn: ({ id, ...body }: Partial<FAQItem>) =>
        id ? api<FAQItem>(`/admin/faq/${id}/`, { method: 'PATCH', body }) : api<FAQItem>('/admin/faq/', { method: 'POST', body }),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api<void>(`/admin/faq/${id}/`, { method: 'DELETE' }), onSuccess: done }),
  };
}

export function useTeam(enabled: boolean) {
  return useQuery({ queryKey: qk.admin.team, queryFn: ({ signal }) => api<User[]>('/admin/team/', { signal }), enabled });
}

export function useSaveTeamMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<User> & { password?: string }) =>
      id ? api<User>(`/admin/team/${id}/`, { method: 'PATCH', body }) : api<User>('/admin/team/', { method: 'POST', body }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.admin.team });
      client.invalidateQueries({ queryKey: qk.admin.staff });
    },
  });
}

// ---------- e-mail alerts ----------
export function useNotifications(f: { status?: string; page?: number }) {
  return useQuery({
    queryKey: qk.admin.notifications.list(f),
    queryFn: ({ signal }) => api<Paginated<AdminNotification>>(`/admin/notifications/${qs(f)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useNotificationSummary(enabled: boolean) {
  return useQuery({
    queryKey: qk.admin.notifications.summary,
    queryFn: ({ signal }) => api<{ by_status: Record<string, number>; failed: number; skipped: number }>('/admin/notifications/summary/', { signal }),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useResendNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<AdminNotification & { sent_now: boolean | null }>(`/admin/notifications/${id}/resend/`, { method: 'POST' }),
    onSettled: () => client.invalidateQueries({ queryKey: qk.admin.notifications.all }),
  });
}
