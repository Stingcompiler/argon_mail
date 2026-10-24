import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Shared drawing helpers for build-time images (Open Graph, icons).
 * next/og (satori) shapes Arabic letters but does not reorder words for
 * right-to-left text, so each word is its own box in a row-reverse flex row.
 * IBM Plex Sans Arabic, the site's own family (docs/design/DESIGN.md), from the
 * @fontsource .woff files that satori can read.
 */
// Identity «بريد عرجون للخدمات الإلكترونية والرقمية» (docs/brand-redesign-plan.md).
export const BRAND = { navy: '#05285B', royal: '#0771C1', cyan: '#15A7D7', sky: '#DEEDFB', surface: '#F5F9FD' };

export async function plex(weight: 400 | 700) {
  const file = join(process.cwd(), `node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-${weight}-normal.woff`);
  return { name: 'IBM Plex Sans Arabic', data: await readFile(file), weight, style: 'normal' as const };
}

export async function brandMarkDataUri() {
  const svg = await readFile(join(process.cwd(), 'public/brand/arjoon-mark.svg'), 'utf8');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function RtlLine({ text, size, color, weight = 700 }: { text: string; size: number; color: string; weight?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: size * 0.22, fontSize: size, color, fontWeight: weight, lineHeight: 1.4 }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => <span key={i}>{w}</span>)}
    </div>
  );
}
