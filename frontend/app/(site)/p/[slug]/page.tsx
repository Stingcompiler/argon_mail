import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PageView } from '@/components/site/PageView';
import { getPage, ogBase } from '@/lib/server-api';

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props['params']) {
  await connection();
  let slug: string;
  try {
    slug = decodeURIComponent((await params).slug);
  } catch {
    notFound();
  }
  if (slug === 'privacy' || slug === 'terms') notFound(); // they live at /privacy and /terms
  return (await getPage(slug)) || notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load(params);
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.body.replace(/^## /gm, '').slice(0, 160);
  const url = `/p/${encodeURIComponent(p.slug)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { ...ogBase, title, description, url } };
}

export default async function CustomPage({ params }: Props) {
  return <PageView page={await load(params)} />;
}
