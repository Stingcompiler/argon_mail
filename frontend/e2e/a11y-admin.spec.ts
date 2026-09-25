import { test } from '@playwright/test';
import { audit } from './axe';
import { adminLogin } from './helpers';

test.describe('accessibility (admin)', () => {
  test('every dashboard screen', async ({ page }) => {
    await adminLogin(page, '/admin');
    await audit(page);
    for (const path of ['/admin/orders', '/admin/messages', '/admin/services', '/admin/statuses', '/admin/notifications', '/admin/media', '/admin/pages', '/admin/appearance', '/admin/settings', '/admin/team']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await audit(page);
    }
  });
});
