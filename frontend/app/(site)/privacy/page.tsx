import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PageView } from '@/components/site/PageView';
import { getPage, ogBase } from '@/lib/server-api';

const SLUG = 'privacy';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const p = await getPage(SLUG);
  if (!p) return {};
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.body.replace(/^## /gm, '').slice(0, 160);
  return { title, description, alternates: { canonical: '/privacy' }, openGraph: { ...ogBase, title, description, url: '/privacy' } };
}

export default async function Page() {
  await connection();
  const p = await getPage(SLUG);
  if (!p) notFound();
  return <PageView page={p} />;
}
