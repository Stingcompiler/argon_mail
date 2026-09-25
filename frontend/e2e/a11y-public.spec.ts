import { expect, test } from '@playwright/test';
import { audit } from './axe';
import { serviceUrl } from './helpers';

test.describe('accessibility (axe, WCAG AA)', () => {
  for (const [name, url] of [['home', '/'], ['services', '/services'], ['service', serviceUrl], ['track', '/track'], ['contact', '/contact'], ['privacy', '/privacy']]) {
    test(`public: ${name}`, async ({ page }) => {
      await page.goto(url);
      await audit(page);
    });
  }

  test('order form errors are tied to their fields and focused', async ({ page }) => {
    await page.goto(serviceUrl);
    await page.getByLabel('الاسم الكامل').fill('عميل ناقص');
    await page.getByLabel('رقم الهاتف بدون مفتاح الدولة').fill('1234567890123456');
    await page.getByLabel('وجهة الإرسال').fill('جدة');
    await page.getByLabel(/نوع الشحنة/).selectOption({ index: 1 });
    await page.locator('input[name=consent]').check();
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    const phone = page.getByLabel('رقم الهاتف بدون مفتاح الدولة');
    await expect(phone).toBeFocused();
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toHaveAccessibleDescription(/طول رقم الهاتف غير صحيح/);
    await audit(page);
  });
});
