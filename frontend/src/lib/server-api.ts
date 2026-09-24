import 'server-only';
import type { Category, PublicService, PublicServiceDetail, PublicSite } from './api/types';

/**
 * Server Components fetch Django directly on its internal address. Results
 * live in the Next.js Data Cache for REVALIDATE seconds and are dropped
 * immediately by tag when Django calls /internal/revalidate after a change.
 * Tags must match apps/revalidation/signals.py.
 */
const BASE = (process.env.DJANGO_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const REVALIDATE = 60;
export const TAGS = { services: 'services', site: 'site', service: (slug: string) => `service:${slug}` };

async function get<T>(path: string, tags: string[]): Promise<T | null> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { Accept: 'application/json', 'X-Internal-Secret': process.env.INTERNAL_SECRET || '' },
    next: { revalidate: REVALIDATE, tags },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const getSite = async () => (await get<PublicSite>('/public/site/', [TAGS.site]))!;
export const getServices = async () => (await get<PublicService[]>('/public/services/', [TAGS.services])) || [];
export const getCategories = async () => (await get<Category[]>('/public/categories/', [TAGS.services])) || [];
export const getService = (slug: string) =>
  get<PublicServiceDetail>(`/public/services/${encodeURIComponent(slug)}/`, [TAGS.service(slug)]);
export const getServiceRedirect = (slug: string) =>
  get<{ slug: string }>(`/public/service-redirects/${encodeURIComponent(slug)}/`, [TAGS.service(slug), TAGS.services]);

export const siteUrl = () => (process.env.SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
