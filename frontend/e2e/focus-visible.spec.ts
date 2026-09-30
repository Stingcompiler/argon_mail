import { expect, test } from '@playwright/test';

/**
 * WCAG 2.2 — 2.4.11 Focus Not Obscured (Minimum): on phones the header and
 * the tab bar stay on screen, so a keyboard user tabbing through a page must
 * never land on an element hidden behind either of them.
 */
for (const url of ['/', '/services', '/contact']) {
  test(`phone: focus is never hidden under the header or tab bar (${url})`, async ({ page }) => {
    await page.goto(url);
    const hidden: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        if (el.closest('header, .tab-bar, .whatsapp')) return { skip: true };
        const box = el.getBoundingClientRect();
        // What is actually on top at a few points across the element.
        const xs = [box.left + 4, (box.left + box.right) / 2, box.right - 4];
        const ys = [box.top + 4, (box.top + box.bottom) / 2, box.bottom - 4];
        let hiddenPts = 0, pts = 0;
        for (const x of xs) for (const y of ys) {
          if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) continue;
          pts++;
          const top = document.elementFromPoint(x, y);
          if (top && !el.contains(top) && top.closest('header, .tab-bar, .whatsapp')) hiddenPts++;
        }
        return { skip: false, name: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), hiddenPts, pts };
      });
      if (!r || r.skip) continue;
      // Entirely hidden fails 2.4.11; flag anything more than half covered.
      if (r.pts && r.hiddenPts * 2 > r.pts) hidden.push(`${r.name} (${r.hiddenPts}/${r.pts} points covered)`);
    }
    expect(hidden).toEqual([]);
  });
}
