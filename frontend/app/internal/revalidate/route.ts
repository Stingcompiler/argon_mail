import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/** Called by Django (apps/revalidation) after public content changes. */
export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_SECRET || '';
  const sent = req.headers.get('x-internal-secret') || '';
  const ok = secret.length > 0 && sent.length === secret.length && timingSafeEqual(Buffer.from(sent), Buffer.from(secret));
  if (!ok) return NextResponse.json({ detail: 'forbidden' }, { status: 403 });
  const { tags } = (await req.json().catch(() => ({}))) as { tags?: unknown };
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string') || tags.length > 50) {
    return NextResponse.json({ detail: 'invalid tags' }, { status: 400 });
  }
  tags.forEach((t: string) => revalidateTag(t));
  return NextResponse.json({ revalidated: tags });
}
