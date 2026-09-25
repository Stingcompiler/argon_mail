import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PageView } from '@/components/site/PageView';
import { getPage, ogBase } from '@/lib/server-api';

const SLUG = 'privacy';

type Props = { searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await connection();
  const preview = (await searchParams).preview;
  const p = await getPage(SLUG, preview);
  if (!p) return {};
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.body.replace(/^## /gm, '').slice(0, 160);
  return { title, description, alternates: { canonical: '/privacy' }, openGraph: { ...ogBase, title, description, url: '/privacy' }, ...(preview && { robots: { index: false, follow: false } }) };
}

export default async function Page({ searchParams }: Props) {
  await connection();
  const preview = (await searchParams).preview;
  const p = await getPage(SLUG, preview);
  if (!p) notFound();
  return <PageView page={p} preview={!!preview} />;
}
