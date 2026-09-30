import { expect, test } from '@playwright/test';
import { adminLogin } from './helpers';

/** Runs on the phone and the desktop project: every section, "view site" and
 * logout must be reachable at both sizes without horizontal scrolling. */
test.describe('dashboard navigation', () => {
  test('phone: menu drawer opens, navigates, closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await adminLogin(page, '/admin');
    const menu = page.getByRole('button', { name: 'القائمة', exact: true });
    const drawer = page.getByRole('dialog', { name: 'قائمة لوحة التحكم' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: 'الرسائل' })).toBeHidden();

    await menu.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'عرض الموقع' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await drawer.getByRole('link', { name: 'الرسائل' }).click();
    await expect(page).toHaveURL(/\/admin\/messages$/);
    await expect(drawer).toBeHidden();
    await expect(page.locator('.admin-crumbs')).toContainText('الرسائل');
    const m = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(m, 'no horizontal scroll').toBeLessThanOrEqual(1);
  });

  test('desktop: sidebar always visible, logout reachable on a short screen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout');
    await page.setViewportSize({ width: 1280, height: 620 });
    await adminLogin(page, '/admin');
    await expect(page.getByRole('button', { name: 'القائمة', exact: true })).toBeHidden();
    const nav = page.getByRole('navigation', { name: 'أقسام لوحة التحكم' });
    await expect(nav.getByRole('link', { name: 'نظرة عامة' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'تسجيل الخروج' })).toBeInViewport();
    // The section list scrolls on its own; the last section is reachable.
    await nav.getByRole('link', { name: 'الفريق والصلاحيات' }).scrollIntoViewIfNeeded();
    await expect(nav.getByRole('link', { name: 'الفريق والصلاحيات' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'تسجيل الخروج' })).toBeInViewport();
  });
});
