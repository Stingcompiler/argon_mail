import { ImageResponse } from 'next/og';
import { brandMarkDataUri } from '@/lib/og/render';
import { createElement } from 'react';

// Browsers request /favicon.ico regardless of <link rel="icon">; serve a
// 32×32 PNG of the brand mark instead of a 404 (a console error in Lighthouse).
export const dynamic = 'force-static';

export async function GET() {
  const mark = await brandMarkDataUri();
  return new ImageResponse(
    createElement('div', { style: { width: '100%', height: '100%', display: 'flex' } },
      createElement('img', { src: mark, width: 32, height: 32, alt: '' })),
    { width: 32, height: 32, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
