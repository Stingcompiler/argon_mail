'use client';
/**
 * Single browser-side API client. Every request goes to the same origin
 * (/api/v1/...), which the Next.js server proxies to Django.
 *
 * - The access token lives only in this module's memory (set by AuthProvider).
 * - On 401 it asks AuthProvider to refresh once, then retries the request.
 * - Errors are thrown as ApiError so TanStack Query exposes them uniformly.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => { accessToken = t; },
};
export function setRefreshHandler(fn: (() => Promise<string | null>) | null) { refreshHandler = fn; }

type Options = { method?: string; body?: unknown; auth?: boolean; idempotencyKey?: string; signal?: AbortSignal };

async function send(path: string, o: Options, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && o.body instanceof FormData;
  if (o.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (o.auth && token) headers.Authorization = `Bearer ${token}`;
  if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;
  try {
    return await fetch(`/api/v1${path}`, {
      method: o.method || 'GET',
      headers,
      body: o.body === undefined ? undefined : isForm ? (o.body as FormData) : JSON.stringify(o.body),
      credentials: 'same-origin',
      signal: o.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'network', 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.');
  }
}

async function toError(res: Response) {
  let data: { detail?: string; code?: string; errors?: Record<string, unknown> } = {};
  try { data = await res.json(); } catch {}
  const fallback = res.status === 413 ? 'حجم الملفات المرفقة أكبر من المسموح.' : res.status === 429 ? 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.'
    : res.status >= 500 ? 'حدث خطأ في الخادم. أعد المحاولة بعد قليل.' : 'تعذّر إتمام الطلب.';
  return new ApiError(res.status, data.code || String(res.status), data.detail || fallback, data.errors || {});
}

export async function api<T>(path: string, o: Options = {}): Promise<T> {
  const opts = { auth: true, ...o };
  let res = await send(path, opts, accessToken);
  if (res.status === 401 && opts.auth && refreshHandler) {
    const fresh = await refreshHandler();
    if (!fresh) throw new ApiError(401, 'session_expired', 'انتهت الجلسة. سجّل الدخول مجددًا.');
    res = await send(path, opts, fresh);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Auth endpoints read the HttpOnly refresh cookie; they never send a Bearer token. */
export async function authCall<T>(path: 'login' | 'refresh' | 'logout', body?: unknown): Promise<T> {
  const res = await send(`/auth/${path}/`, { method: 'POST', body, auth: false }, null);
  if (!res.ok) throw await toError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const out: Record<string, string> = {};
  const walk = (obj: unknown, prefix = '') => {
    if (Array.isArray(obj)) { if (typeof obj[0] === 'string') out[prefix] = obj[0]; else obj.forEach((v, i) => walk(v, `${prefix}.${i}`)); return; }
    if (obj && typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => walk(v, prefix ? `${prefix}.${k}` : k));
  };
  walk(error.errors);
  return out;
}

export const newIdempotencyKey = () => crypto.randomUUID();
