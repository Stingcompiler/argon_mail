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

test('service page: floating «اطلب الخدمة» takes you to the form', async ({ page }) => {
  await page.goto('/services/' + encodeURIComponent('إرسال-الطرود-والمستندات'));
  const cta = page.getByRole('button', { name: /اطلب الخدمة/ });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.getByLabel('الاسم الكامل')).toBeFocused();
  await expect(page.locator('.order-cta')).toHaveClass(/is-hidden/);
});

test('FAQ opens and closes; a closed answer is hidden from assistive tech', async ({ page }) => {
  await page.goto('/');
  const second = page.locator('.faq-item button').nth(1);
  await second.scrollIntoViewIfNeeded();
  await expect(second).toHaveAttribute('aria-expanded', 'false');
  const answer = page.locator('.faq-answer').nth(1);
  await expect(answer).toBeHidden();
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(answer).toBeVisible();
});

/** A hydration mismatch makes React throw away the server HTML and redraw the
 * page (it happened on every page with a phone field). No page error allowed. */
test('public pages hydrate without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const url of ['/', '/services', '/services/' + encodeURIComponent('إرسال-الطرود-والمستندات'), '/contact', '/track', '/about']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});

/** Landing plan, phase 1: the first screen names the next step for a new
 * visitor (services) and, separately, for an existing customer (tracking). */
test('home: both journeys are on the first screen, each with one destination', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.hero-actions');
  const browse = hero.getByRole('link', { name: 'استعرض الخدمات' });
  const track = hero.getByRole('link', { name: 'تابع طلبك' });
  await expect(browse).toBeInViewport();
  await expect(track).toBeInViewport();
  await expect(browse).toHaveAttribute('href', '/services');
  await expect(track).toHaveAttribute('href', '/track');
});

/** Landing plan, phase 2: on phones the default artwork gives way, so the
 * featured services start right after the hero actions. */
test('home (phone): no default artwork before the services', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('.hero-visual:not(.has-image)');
  if (await visual.count()) await expect(visual).toBeHidden();
  const actions = await page.locator('.hero-actions').boundingBox();
  const services = await page.locator('.services-section').boundingBox();
  expect(services!.y - (actions!.y + actions!.height)).toBeLessThan(160);
});

/** Landing plan, phase 3: concrete facts instead of broad reassurance. */
test('home: verifiable facts and what happens after submitting', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-trust').getByRole('link', { name: /تفاصيلك للفريق فقط/ })).toHaveAttribute('href', '/privacy');
  const after = page.getByRole('heading', { name: 'بعد إرسال طلبك' });
  await expect(after).toBeAttached();
  await expect(page.locator('.after-submit li')).toHaveCount(4);
});
