import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Shared drawing helpers for build-time images (Open Graph, icons).
 * next/og (satori) shapes Arabic letters but does not reorder words for
 * right-to-left text, so each word is its own box in a row-reverse flex row.
 * Cairo is used here because satori cannot read Noto Sans Arabic's GSUB tables.
 */
export const BRAND = { green: '#145A46', cream: '#FAF8F2', sage: '#DDEBE3', gold: '#D9A441', ink: '#202923' };

export async function cairo(weight: 400 | 700) {
  const file = join(process.cwd(), `node_modules/@fontsource/cairo/files/cairo-arabic-${weight}-normal.woff`);
  return { name: 'Cairo', data: await readFile(file), weight, style: 'normal' as const };
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
