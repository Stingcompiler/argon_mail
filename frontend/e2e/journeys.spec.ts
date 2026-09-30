import { expect, test, type Page } from '@playwright/test';
import { SERVICE, noHorizontalScroll, placeOrder } from './helpers';

/**
 * Landing plan, phase 5: journeys that start on the home page, the analytics
 * events they produce, and the layout checks across widths and settings.
 */

/** Collects «arjoon:event» dispatches across navigations (kept in sessionStorage). */
async function recordEvents(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('arjoon:event', (e) => {
      const list = JSON.parse(sessionStorage.getItem('e2e-events') || '[]');
      list.push((e as CustomEvent).detail);
      sessionStorage.setItem('e2e-events', JSON.stringify(list));
    });
  });
}
const events = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('e2e-events') || '[]') as Record<string, string>[]);

test('home → area → service → request submitted, with events that carry no personal data', async ({ page }) => {
  await recordEvents(page);
  const name = `رحلة الرئيسية ${Date.now()}`;
  await page.goto('/');
  // The main card (the area) leads to its services as tiles.
  await page.locator('.services-section').getByRole('link', { name: /خدمات بريدية/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'خدمات بريدية' })).toBeVisible();
  await page.locator('.service-tiles').getByRole('link', { name: 'إرسال الطرود والمستندات' }).click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(SERVICE)));
  await page.getByLabel('الاسم الكامل').fill(name);
  await page.getByRole('combobox', { name: 'الدولة' }).first().selectOption('SA');
  await page.getByLabel('رقم الهاتف بدون مفتاح الدولة').fill('0501234567');
  await page.getByLabel('وجهة الإرسال').fill('جدة');
  await page.getByLabel(/نوع الشحنة/).selectOption({ index: 1 });
  await page.locator('input[name=consent]').check();
  await page.getByRole('button', { name: /إرسال الطلب/ }).click();
  await expect(page).toHaveURL(/\/order-success\?code=ARJ-/);
  const code = new URL(page.url()).searchParams.get('code')!;

  const got = await events(page);
  expect(got.map((e) => e.name)).toEqual(['category_select', 'service_select', 'request_start', 'request_complete']);
  expect(got[0]).toMatchObject({ category: 'خدمات-بريدية', area: 'featured' });
  expect(got[1]).toMatchObject({ service: SERVICE });
  expect(got[2]).toMatchObject({ service: SERVICE });
  const raw = JSON.stringify(got);
  for (const personal of [name, '501234567', code]) expect(raw).not.toContain(personal);
});

test('home → tracking with an unknown code, then a real one', async ({ page }) => {
  await recordEvents(page);
  await page.goto('/');
  const strip = page.locator('.tracking-strip');
  await strip.getByLabel('رقم الطلب').fill('ARJ-NOTREAL1');
  await strip.getByRole('button', { name: /تتبع الطلب/ }).click();
  await expect(page).toHaveURL(/\/track\?code=ARJ-NOTREAL1/);
  await expect(page.getByRole('heading', { name: 'لم نعثر على هذا الطلب' })).toBeVisible();

  // A real code, from an order placed through the form.
  const code = await placeOrder(page, `عميل متابعة ${Date.now()}`);
  await page.goto('/');
  await strip.getByLabel('رقم الطلب').fill(code.toLowerCase()); // codes are case-insensitive
  await strip.getByRole('button', { name: /تتبع الطلب/ }).click();
  await expect(page.getByText('تم استلام الطلب')).toBeVisible();

  const got = await events(page);
  expect(got.filter((e) => e.name === 'tracking_start')).toEqual([{ name: 'tracking_start', method: 'code' }, { name: 'tracking_start', method: 'code' }]);
  expect(got.filter((e) => e.name === 'request_complete')).toHaveLength(1);
  expect(JSON.stringify(got)).not.toContain(code);
});

test('home → contact, and WhatsApp only where configured', async ({ page }) => {
  await recordEvents(page);
  await page.goto('/');
  await page.getByRole('navigation', { name: 'التنقل السريع' }).getByRole('link', { name: 'تواصل' }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect((await events(page)).at(-1)).toEqual({ name: 'contact_click', channel: 'contact_page', area: 'tab_bar' });
  // Every WhatsApp link points at wa.me and opens in a new tab; none is empty.
  for (const link of await page.locator('a[href*="wa.me"], a[href*="whatsapp.com"]').all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\/(wa\.me|api\.whatsapp\.com)\/\d+/);
    await expect(link).toHaveAttribute('target', '_blank');
  }
});

test('home fits every width from 320 to 1920 (and 200% zoom)', async ({ browser }) => {
  // 320 CSS px is also what a 640px window shows at 200% zoom (WCAG reflow).
  for (const width of [320, 390, 768, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ar' });
    const page = await ctx.newPage();
    await page.goto('/');
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(scroll, `horizontal scroll at ${width}px`).toBeLessThanOrEqual(1);
    await expect(page.locator('.hero-actions .button').first()).toBeInViewport();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await ctx.close();
  }
});

test('keyboard: skip link first, then visible focus on the hero actions', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'تخطَّ إلى المحتوى' })).toBeFocused();
  const browse = page.locator('.hero-actions').getByRole('link', { name: 'استعرض الخدمات' });
  for (let i = 0; i < 30 && !(await browse.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(browse).toBeFocused();
  const outline = await browse.evaluate((el) => { const s = getComputedStyle(el); return `${s.outlineStyle} ${s.outlineWidth}`; });
  expect(outline).not.toMatch(/^none|0px$/);
  await ctx.close();
});

test('reduced motion: nothing animates on the home page', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', locale: 'ar' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number(a.effect?.getComputedTiming().duration) > 20).length);
  expect(running).toBe(0);
  await noHorizontalScroll(page);
  await ctx.close();
});

/** Brand redesign, phase 4: areas are main cards; services are tiles inside them. */
test('services page: area cards, and a search that shows matching tiles', async ({ page }) => {
  await page.goto('/services');
  const cards = page.locator('.category-grid .category-card');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first().locator('h3')).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'ابحث عن خدمة' });
  await search.fill('الطرود');
  await expect(page.locator('.service-tiles').getByRole('link', { name: 'إرسال الطرود والمستندات' })).toBeVisible();
  await expect(cards).toHaveCount(0);
  await search.fill('كلمة لا توجد');
  await expect(page.getByRole('heading', { name: 'لم نجد خدمة بهذا الاسم' })).toBeVisible();
  await search.fill('');
  await expect(cards.first()).toBeVisible();
  // A search from elsewhere arrives as ?q=
  await page.goto('/services?q=' + encodeURIComponent('السفر'));
  await expect(page.locator('.service-tiles').getByRole('link', { name: 'تنسيق متطلبات السفر' })).toBeVisible();
});

test('area page: its services as tiles, a tracking tile, and a way back', async ({ page }) => {
  await page.goto('/services/category/' + encodeURIComponent('خدمات-بريدية'));
  await expect(page.getByRole('heading', { level: 1, name: 'خدمات بريدية' })).toBeVisible();
  const tiles = page.locator('.service-tiles');
  await expect(tiles.getByRole('link', { name: 'إرسال الطرود والمستندات' })).toHaveAttribute('href', '/services/' + encodeURIComponent(SERVICE));
  await expect(tiles.getByRole('link', { name: 'تتبع طلبك' })).toHaveAttribute('href', '/track');
  await expect(page.getByRole('link', { name: 'كل المجالات' })).toHaveAttribute('href', '/services');
  expect((await page.request.get('/services/category/' + encodeURIComponent('لا-يوجد'))).status()).toBe(404);
});
