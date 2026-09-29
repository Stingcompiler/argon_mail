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
