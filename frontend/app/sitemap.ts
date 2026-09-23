import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { getServices, siteUrl } from '@/lib/server-api';

/** Published services and public pages only. Drafts, admin, tracking and
 * success pages are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const services = await getServices();
  const pages = ['', '/services', '/about', '/contact', '/privacy', '/terms'].map((p) => ({
    url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6,
  }));
  return [
    ...pages,
    ...services.map((s) => ({ url: `${base}/services/${encodeURIComponent(s.slug)}`, lastModified: s.updated_at, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
