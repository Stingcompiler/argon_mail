import { expect, test } from '@playwright/test';
import { adminLogin, creds, placeOrder } from './helpers';

test.describe('admin dashboard', () => {
  test('no JWT in browser storage; refresh cookie not readable by JS', async ({ page }) => {
    await adminLogin(page);
    const leaked = await page.evaluate(() => {
      const values = [...Object.values(localStorage), ...Object.values(sessionStorage)];
      return { jwt: values.some((v) => /eyJ[\w-]+\.[\w-]+\.[\w-]+/.test(v)), cookie: document.cookie };
    });
    expect(leaked.jwt).toBe(false);
    expect(leaked.cookie).not.toContain('arjoon_refresh');
  });

  test('status change updates the list without reload and shows on tracking', async ({ page, browser }) => {
    const customer = await browser.newPage();
    const code = await placeOrder(customer, `عميل حالة ${Date.now()}`);

    await adminLogin(page, '/admin/orders');
    const row = page.locator('tbody tr', { hasText: code });
    await expect(row).toContainText('جديد');
    await row.click();
    const drawer = page.getByRole('dialog', { name: 'تفاصيل الطلب' });
    await drawer.getByLabel('حالة التنفيذ').selectOption({ label: 'قيد التنفيذ' });
    await drawer.getByLabel('ملاحظة عامة').fill('بدأنا تجهيز طلبك.');
    await drawer.getByRole('button', { name: 'حفظ التحديث' }).click();
    await expect(page.getByRole('status')).toContainText('تم حفظ التحديث');
    await drawer.getByRole('button', { name: 'إغلاق', exact: true }).click();
    await expect(row).toContainText('قيد التنفيذ'); // TanStack Query invalidation, no reload

    await customer.goto(`/track?code=${code}`);
    await expect(customer.getByText('بدأنا تجهيز طلبك.')).toBeVisible();
    await expect(customer.locator('.tracking-result .badge')).toContainText('قيد التنفيذ');
  });

  test('expired access token is refreshed silently and the request retried', async ({ page }) => {
    await adminLogin(page);
    let rejected = 0;
    await page.route('**/api/v1/admin/orders/?**', async (route) => {
      if (rejected++ === 0) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"expired","code":"token_not_valid"}' });
      return route.continue();
    });
    const refreshed = page.waitForResponse((r) => r.url().includes('/api/v1/auth/refresh/') && r.status() === 200);
    await page.goto('/admin/orders');
    await refreshed;
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'انتهت الجلسة' })).toHaveCount(0);
  });

  test('session end keeps the open draft; Escape does not close the drawer below', async ({ page, browser }) => {
    const customer = await browser.newPage();
    const code = await placeOrder(customer, `عميل جلسة ${Date.now()}`);
    await adminLogin(page, '/admin/orders');
    await page.locator('tbody tr', { hasText: code }).click();
    const drawer = page.getByRole('dialog', { name: 'تفاصيل الطلب' });
    await drawer.getByRole('tab', { name: 'الملاحظات' }).click();
    await drawer.getByLabel('نص الملاحظة').fill('مسودة لم تُحفظ بعد');

    // The session ends: every API call and the refresh are rejected.
    await page.route('**/api/v1/admin/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"x"}' }));
    await page.route('**/api/v1/auth/refresh/', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"x","code":"session_expired"}' }));
    await drawer.getByRole('button', { name: 'إضافة الملاحظة' }).click();
    const relogin = page.getByRole('dialog', { name: 'انتهت الجلسة' });
    await expect(relogin).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(relogin).toBeVisible();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel('نص الملاحظة')).toHaveValue('مسودة لم تُحفظ بعد');

    await page.unroute('**/api/v1/admin/**');
    await page.unroute('**/api/v1/auth/refresh/');
    const { login, password } = creds();
    await relogin.getByLabel('البريد الإلكتروني أو اسم المستخدم').fill(login);
    await relogin.getByLabel('كلمة المرور').fill(password);
    await relogin.getByRole('button', { name: /دخول/ }).click();
    await expect(relogin).toHaveCount(0);
    await expect(drawer.getByLabel('نص الملاحظة')).toHaveValue('مسودة لم تُحفظ بعد');
    await drawer.getByRole('button', { name: 'إضافة الملاحظة' }).click();
    await expect(drawer.locator('.note-list')).toContainText('مسودة لم تُحفظ بعد');
  });

  test('draft service preview opens with a banner', async ({ page, context }) => {
    await adminLogin(page, '/admin/services');
    await page.locator('.managed-card', { hasText: 'خدمة مسودة للمعاينة' }).getByRole('button', { name: /تحرير الخدمة/ }).click();
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: /معاينة المسودة/ }).click();
    const preview = await popup;
    await expect(preview.getByText('معاينة مسودة غير منشورة')).toBeVisible();
    await expect(preview.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
