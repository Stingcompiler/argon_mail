import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for acceptance rows that API tests cannot cover
 * (IMPLEMENTATION_PLAN.md §8). They run against an already running stack:
 * scripts/local-prod.sh locally, the e2e job in CI.
 *   E2E_BASE_URL (default http://127.0.0.1:3108)
 *   E2E_LOGIN / E2E_PASSWORD: an admin account (see scripts/ci/prepare_e2e.py)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // one shared database
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3108',
    locale: 'ar',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', testMatch: /(customer|a11y-public|admin-nav)\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'desktop', testMatch: /(admin|a11y-admin|admin-nav)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
});
