// Screenshots of the representative screens (docs/ui-profile.md), before and
// after each UI batch, so the visual review is real and repeatable.
//
//   E2E_LOGIN=… E2E_PASSWORD=… npm run shots -- <label>
//   BASE_URL (default http://127.0.0.1:3108), TRACK_CODE (an existing order code)
//
// Output: ../shots/<label>/<screen>--<viewport>--light--ar.png (git-ignored).
// Motion is reduced and the clock fixed so runs can be compared.
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3108';
const LABEL = process.argv[2] || 'current';
const OUT = path.resolve(import.meta.dirname, '../../shots', LABEL);
const AREA = '/services/category/' + encodeURIComponent('خدمات-تعليمية');
const SERVICE = 'المساعدة-في-التقديم-الدراسي';

const VIEWPORTS = [
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];
// From the profile: public screens with their important states, then the dashboard.
const PUBLIC = [
  { name: 'home', path: '/' },
  { name: 'services', path: '/services' },
  { name: 'services-search-empty', path: '/services?q=' + encodeURIComponent('كلمة لا توجد') },
  { name: 'area', path: AREA },
  { name: 'area-order-dialog', path: `${AREA}?service=${encodeURIComponent(SERVICE)}`, wait: '[role="dialog"] input' },
  { name: 'service', path: '/services/' + encodeURIComponent(SERVICE) },
  { name: 'track-not-found', path: '/track?code=ARJ-NOTREAL1', wait: '[role="alert"]' },
  ...(process.env.TRACK_CODE ? [{ name: 'track-result', path: '/track?code=' + process.env.TRACK_CODE, wait: '.tracking-result' }] : []),
  { name: 'contact', path: '/contact' },
];
const ADMIN = [
  { name: 'admin-overview', path: '/admin' },
  { name: 'admin-orders', path: '/admin/orders' },
  { name: 'admin-services', path: '/admin/services' },
  { name: 'admin-settings', path: '/admin/settings' },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    ...(vp.mobile ? { isMobile: true, hasTouch: true, userAgent: devices['Pixel 7'].userAgent } : {}),
    deviceScaleFactor: 1, colorScheme: 'light', locale: 'ar', reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-16T10:00:00'));
  const shoot = async (s) => {
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
    if (s.wait) await page.locator(s.wait).first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${s.name}--${vp.name}--light--ar.png`, fullPage: !s.wait });
  };
  for (const s of PUBLIC) await shoot(s);
  if (process.env.E2E_LOGIN && process.env.E2E_PASSWORD && vp.name !== 'tablet-768') {
    await page.goto(BASE + '/admin/login');
    await page.getByLabel('البريد الإلكتروني أو اسم المستخدم').fill(process.env.E2E_LOGIN);
    await page.getByLabel('كلمة المرور').fill(process.env.E2E_PASSWORD);
    await page.getByRole('button', { name: /دخول/ }).click();
    await page.waitForURL(/\/admin$/);
    for (const s of ADMIN) await shoot(s);
  }
  await ctx.close();
}
await browser.close();
console.log(`shots: ${fs.readdirSync(OUT).length} files in ${OUT}`);
