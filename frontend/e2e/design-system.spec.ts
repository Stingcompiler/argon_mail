import { expect, test } from '@playwright/test';

/**
 * Design batch 2: the public pages use the shared design tokens. Radii come
 * from the scale (8/12/16/24px, pills, circles) plus the documented brand
 * shapes; decorative icons (25px and up) are drawn at stroke 1.5; internal
 * links use one «go» arrow.
 */
const PAGES = ['/', '/services', '/services/' + encodeURIComponent('إرسال-الطرود-والمستندات'), '/track', '/contact', '/about'];
const RADII = new Set(['8px', '12px', '16px', '24px', '999px', '50%']);
// Brand mark, hero arch, and the thin text lines inside the hero artwork.
const SHAPES = /^(brand-symbol|hero-visual|j-line)$/;
// Interface icons at 25px+ that keep the default stroke: logo leaf, WhatsApp, spinner, menu.
const UI_ICONS = /lucide-(leaf|message-circle|loader-circle|menu)\b/;

test('public pages use the radius scale, icon strokes and arrows of the design system', async ({ page }) => {
  for (const url of PAGES) {
    await page.goto(url);
    const found = await page.evaluate(() => {
      const radii: string[] = [];
      const strokes: string[] = [];
      for (const e of document.querySelectorAll<HTMLElement | SVGElement>('body *')) {
        if (!(e as HTMLElement).getClientRects().length) continue;
        const cls = (e.getAttribute('class') || '').split(' ')[0] || e.tagName.toLowerCase();
        const r = getComputedStyle(e).borderRadius;
        if (r !== '0px' && r.split(' ').length === 1) radii.push(`${r} ${cls}`);
        if (e.tagName === 'svg' && e.classList.contains('lucide')) {
          const size = Number(e.getAttribute('width'));
          strokes.push(`${size} ${e.getAttribute('stroke-width')} ${e.getAttribute('class')}`);
        }
      }
      const diagonal = document.querySelectorAll('a[href^="/"] .lucide-arrow-up-left').length;
      return { radii, strokes, diagonal };
    });
    const offScale = found.radii.filter((x) => { const [r, cls] = x.split(' '); return !RADII.has(r) && !SHAPES.test(cls); });
    expect(offScale, `${url}: radii outside the scale`).toEqual([]);
    const heavy = found.strokes.filter((x) => { const [size, stroke, ...cls] = x.split(' '); return Number(size) >= 25 && stroke !== '1.5' && !UI_ICONS.test(cls.join(' ')); });
    expect(heavy, `${url}: decorative icons must use stroke 1.5`).toEqual([]);
    expect(found.diagonal, `${url}: internal links use the left arrow`).toBe(0);
  }
});
