import { expect, test } from '@playwright/test';

/** Phone navigation: bottom tab bar + menu sheet, and the swipeable services row. */
test.describe('site navigation (phone)', () => {
  test('tab bar and menu sheet', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'التنقل السريع' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('aria-current', 'page');

    const menu = page.getByRole('button', { name: 'القائمة', exact: true });
    await menu.click();
    const sheet = page.getByRole('dialog', { name: 'القائمة' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'تابع طلبك' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await sheet.getByRole('link', { name: 'عن المنصة' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(sheet).toBeHidden();

    await tabs.getByRole('link', { name: 'الخدمات' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(tabs.getByRole('link', { name: 'الخدمات' })).toHaveAttribute('aria-current', 'page');
  });

  test('home services scroll sideways without widening the page', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('.services-section .services-grid');
    const m = await row.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, page: document.documentElement.scrollWidth - innerWidth }));
    expect(m.scroll, 'cards overflow the row, so it scrolls').toBeGreaterThan(m.client);
    expect(m.page, 'the page itself does not scroll sideways').toBeLessThanOrEqual(1);
  });
});

/** Type floor on phones: fields ≥16px (else iOS zooms on focus), text ≥12px. */
test.describe('readable on phones', () => {
  for (const url of ['/', '/services', '/track', '/contact']) {
    test(`type sizes: ${url}`, async ({ page }) => {
      await page.goto(url);
      const r = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll<HTMLElement>('input:not([type=checkbox]):not([type=hidden]),select,textarea').forEach((el) => {
          if (el.getBoundingClientRect().width && parseFloat(getComputedStyle(el).fontSize) < 16) bad.push('field ' + (el.getAttribute('aria-label') || el.getAttribute('name')));
        });
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const el = n.parentElement!;
          if (!n.textContent!.trim() || el.closest('[aria-hidden="true"],.sr-only,dialog:not([open]),script,style') || !el.getBoundingClientRect().width) continue;
          if (parseFloat(getComputedStyle(el).fontSize) < 12) bad.push('text «' + n.textContent!.trim().slice(0, 20) + '»');
        }
        return bad;
      });
      expect(r).toEqual([]);
    });
  }
});

test('unknown pages keep the site navigation', async ({ page }) => {
  const r = await page.goto('/this-page-does-not-exist');
  expect(r?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('لم نجد هذه الصفحة.');
  await expect(page.getByRole('navigation', { name: 'التنقل السريع' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'القائمة', exact: true })).toBeVisible();
});
