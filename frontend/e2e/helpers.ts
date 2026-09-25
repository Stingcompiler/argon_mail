import { expect, type Page } from '@playwright/test';

export const SERVICE = 'إرسال-الطرود-والمستندات';
export const serviceUrl = `/services/${encodeURIComponent(SERVICE)}`;

export function creds() {
  const login = process.env.E2E_LOGIN;
  const password = process.env.E2E_PASSWORD;
  if (!login || !password) throw new Error('Set E2E_LOGIN and E2E_PASSWORD to an admin account.');
  return { login, password };
}

export async function adminLogin(page: Page, next = '/admin') {
  const { login, password } = creds();
  await page.goto('/admin/login');
  await page.getByLabel('البريد الإلكتروني أو اسم المستخدم').fill(login);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: /دخول/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  if (next !== '/admin') await page.goto(next);
}

/** Places an order through the public form and returns its tracking code. */
export async function placeOrder(page: Page, name: string, local = '0501234567') {
  await page.goto(serviceUrl);
  await page.getByLabel('الاسم الكامل').fill(name);
  await page.getByRole('combobox', { name: 'الدولة' }).first().selectOption('SA');
  await page.getByLabel('رقم الهاتف بدون مفتاح الدولة').fill(local);
  await page.getByLabel('وجهة الإرسال').fill('جدة');
  await page.getByLabel(/نوع الشحنة/).selectOption({ index: 1 });
  await page.locator('input[name=consent]').check();
  await page.getByRole('button', { name: /إرسال الطلب/ }).click();
  await expect(page).toHaveURL(/\/order-success\?code=ARJ-/);
  return new URL(page.url()).searchParams.get('code')!;
}

/**
 * On phones, content wider than the screen does not scroll: the browser
 * widens the layout viewport and zooms out. So compare the layout viewport
 * with the device screen, as well as scrollWidth.
 */
export async function noHorizontalScroll(page: Page) {
  const m = await page.evaluate(() => ({ inner: window.innerWidth, screen: window.screen.width, scroll: document.documentElement.scrollWidth }));
  expect(m.inner, `layout viewport must match the screen (${JSON.stringify(m)})`).toBeLessThanOrEqual(m.screen);
  expect(m.scroll - m.inner, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
}
