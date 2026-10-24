import { expect, test } from '@playwright/test';
import { adminLogin } from './helpers';
import { numberProblems } from './numbers';

/** docs/design/DESIGN.md «قاعدة الأرقام»: every digit in `.num` / `[data-num]`,
 * numeric columns aligned to the end. */
const PUBLIC = ['/', '/services', '/services/category/' + encodeURIComponent('خدمات-تعليمية'),
  '/services/' + encodeURIComponent('المساعدة-في-التقديم-الدراسي'), '/contact', '/about', '/track?code=ARJ-NOTREAL1'];
const ADMIN = ['/admin', '/admin/orders', '/admin/services', '/admin/media', '/admin/team', '/admin/messages', '/admin/statuses'];

test('public pages: every number is marked as a number', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  const all: string[] = [];
  for (const url of PUBLIC) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    all.push(...(await numberProblems(page)).map((p) => `${url}: ${p}`));
  }
  expect(all).toEqual([]);
});

test('dashboard: every number is marked as a number', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await adminLogin(page);
  const all: string[] = [];
  for (const url of ADMIN) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    all.push(...(await numberProblems(page)).map((p) => `${url}: ${p}`));
  }
  expect(all).toEqual([]);
});
