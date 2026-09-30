import { test } from '@playwright/test';
import { audit } from './axe';
import { adminLogin } from './helpers';

const SCREENS = ['/admin', '/admin/orders', '/admin/messages', '/admin/services', '/admin/statuses', '/admin/notifications',
  '/admin/media', '/admin/pages', '/admin/appearance', '/admin/settings', '/admin/team'];

/** One test per screen: each gets its own time budget, and a failure names the screen. */
test.describe('accessibility (admin)', () => {
  for (const path of SCREENS) {
    test(`admin: ${path}`, async ({ page }) => {
      await adminLogin(page, path);
      await page.waitForLoadState('networkidle');
      await audit(page);
    });
  }
});
