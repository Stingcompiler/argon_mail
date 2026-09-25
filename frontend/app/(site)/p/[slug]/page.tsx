import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PageView } from '@/components/site/PageView';
import { getPage, ogBase } from '@/lib/server-api';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(params: Props['params'], searchParams: Props['searchParams']) {
  await connection();
  const preview = (await searchParams).preview;
  let slug: string;
  try {
    slug = decodeURIComponent((await params).slug);
  } catch {
    notFound();
  }
  if (slug === 'privacy' || slug === 'terms') notFound(); // they live at /privacy and /terms
  const page = await getPage(slug, preview);
  return page ? { ...page, preview: !!preview } : notFound();
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const p = await load(params, searchParams);
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.body.replace(/^## /gm, '').slice(0, 160);
  const url = `/p/${encodeURIComponent(p.slug)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { ...ogBase, title, description, url }, ...(p.preview && { robots: { index: false, follow: false } }) };
}

export default async function CustomPage({ params, searchParams }: Props) {
  const p = await load(params, searchParams);
  return <PageView page={p} preview={p.preview} />;
}
