import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { getCategories, getServices, getSite, siteUrl } from '@/lib/server-api';

/** Published services, their areas and public pages only. Drafts, admin, tracking and
 * success pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const [services, categories, site] = await Promise.all([getServices(), getCategories(), getSite()]);
  const contentPages = (site.pages || []).map((p) => (p.slug === 'privacy' || p.slug === 'terms' ? `/${p.slug}` : `/p/${encodeURIComponent(p.slug)}`));
  const pages = ['', '/services', '/about', '/contact', ...contentPages].map((p) => ({
    url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6,
  }));
  return [
    ...pages,
    ...categories.map((c) => ({ url: `${base}/services/category/${encodeURIComponent(c.slug)}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...services.map((s) => ({ url: `${base}/services/${encodeURIComponent(s.slug)}`, lastModified: s.updated_at, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
