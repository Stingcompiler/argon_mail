import { expect, test } from '@playwright/test';
import { noHorizontalScroll, placeOrder, serviceUrl } from './helpers';

test.describe('customer journey (phone)', () => {
  test('public pages fit the phone screen', async ({ page }) => {
    for (const url of ['/', '/services', serviceUrl, '/track', '/contact', '/privacy']) {
      await page.goto(url);
      await noHorizontalScroll(page);
    }
  });

  test('order → success → track by code → track by name and phone', async ({ page }) => {
    const name = `عميل تجربة ${Date.now()}`;
    const code = await placeOrder(page, name);

    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByText('احتفظ برقم طلبك.')).toBeVisible();
    await noHorizontalScroll(page);

    await page.getByRole('link', { name: /متابعة طلبي/ }).click();
    await expect(page.getByRole('heading', { name: 'إرسال الطرود والمستندات' })).toBeVisible();
    await expect(page.getByText('تم استلام الطلب')).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0); // tracking never shows personal data

    await page.getByRole('button', { name: 'بالاسم ورقم الهاتف' }).click();
    await page.getByLabel('الاسم الكامل').fill(`  ${name.replace('ي', 'ى')} `); // tolerant matching
    await page.getByRole('combobox', { name: 'الدولة' }).selectOption('SA');
    await page.getByLabel('رقم الهاتف بدون مفتاح الدولة').fill('050 123 4567');
    await page.getByRole('button', { name: /ابحث عن طلباتي/ }).click();
    await expect(page.locator('.lookup-list li', { hasText: code })).toBeVisible();
  });

  test('invalid form keeps the inputs and shows errors', async ({ page }) => {
    await page.goto(serviceUrl);
    await page.getByLabel('الاسم الكامل').fill('عميل ناقص');
    await page.getByLabel('رقم الهاتف بدون مفتاح الدولة').fill('1234567890123456'); // passes the input pattern, too long for E.164
    await page.getByLabel('وجهة الإرسال').fill('جدة');
    await page.getByLabel(/نوع الشحنة/).selectOption({ index: 1 });
    await page.locator('input[name=consent]').check();
    await page.getByRole('button', { name: /إرسال الطلب/ }).click();
    await expect(page.getByText('طول رقم الهاتف غير صحيح.')).toBeVisible();
    await expect(page.getByLabel('الاسم الكامل')).toHaveValue('عميل ناقص');
    await expect(page).toHaveURL(new RegExp(encodeURIComponent('إرسال')));
  });
});
