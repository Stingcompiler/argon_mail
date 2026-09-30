import { expect, test } from '@playwright/test';

/** Phone navigation: bottom tab bar + menu sheet, and the swipeable services row. */
test.describe('site navigation (phone)', () => {
  test('tab bar and menu sheet', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'التنقل السريع' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('aria-current', 'page');

    const menu = page.getByRole('button', { name: 'القائمة', exact: true });
    await menu.click();
    const sheet = page.getByRole('dialog', { name: 'القائمة' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'تتبع طلبك' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await sheet.getByRole('link', { name: 'عن المنصة' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(sheet).toBeHidden();

    await tabs.getByRole('link', { name: 'الخدمات' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(tabs.getByRole('link', { name: 'الخدمات' })).toHaveAttribute('aria-current', 'page');
  });

  test('home areas: a two-column grid up to six, a sideways row beyond, never a wider page', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('.services-section .services-grid');
    const m = await row.evaluate((el) => ({
      compact: el.classList.contains('compact-cards'), cards: el.children.length,
      scroll: el.scrollWidth, client: el.clientWidth, page: document.documentElement.scrollWidth - innerWidth,
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      rights: Array.from(el.children).map((c) => Math.round(c.getBoundingClientRect().right)),
    }));
    expect(m.page, 'the page itself does not scroll sideways').toBeLessThanOrEqual(1);
    if (m.cards <= 6) {
      // Audit plan, batch 2: every area on screen, two per row, no swipe.
      expect(m.compact).toBe(true);
      expect(m.columns).toBe(2);
      expect(m.scroll, 'nothing to scroll').toBeLessThanOrEqual(m.client);
      for (const r of m.rights) expect(r).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    } else {
      expect(m.scroll, 'cards overflow the row, so it scrolls').toBeGreaterThan(m.client);
    }
  });
});

/** Type floor on phones: fields ≥16px (else iOS zooms on focus), text ≥12px. */
test.describe('readable on phones', () => {
  for (const url of ['/', '/services', '/track', '/contact']) {
    test(`type sizes: ${url}`, async ({ page }) => {
      await page.goto(url);
      const r = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll<HTMLElement>('input:not([type=checkbox]):not([type=hidden]),select,textarea').forEach((el) => {
          if (el.getBoundingClientRect().width && parseFloat(getComputedStyle(el).fontSize) < 16) bad.push('field ' + (el.getAttribute('aria-label') || el.getAttribute('name')));
        });
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const el = n.parentElement!;
          if (!n.textContent!.trim() || el.closest('[aria-hidden="true"],.sr-only,dialog:not([open]),script,style') || !el.getBoundingClientRect().width) continue;
          if (parseFloat(getComputedStyle(el).fontSize) < 12) bad.push('text «' + n.textContent!.trim().slice(0, 20) + '»');
        }
        return bad;
      });
      expect(r).toEqual([]);
    });
  }
});

test('unknown pages keep the site navigation', async ({ page }) => {
  const r = await page.goto('/this-page-does-not-exist');
  expect(r?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('لم نجد هذه الصفحة.');
  await expect(page.getByRole('navigation', { name: 'التنقل السريع' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'القائمة', exact: true })).toBeVisible();
});

test('service page: floating «اطلب الخدمة» takes you to the form', async ({ page }) => {
  await page.goto('/services/' + encodeURIComponent('إرسال-الطرود-والمستندات'));
  const cta = page.getByRole('button', { name: /اطلب الخدمة/ });
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.getByLabel('الاسم الكامل')).toBeFocused();
  await expect(page.locator('.order-cta')).toHaveClass(/is-hidden/);
});

test('FAQ opens and closes; a closed answer is hidden from assistive tech', async ({ page }) => {
  await page.goto('/');
  const second = page.locator('.faq-item button').nth(1);
  await second.scrollIntoViewIfNeeded();
  await expect(second).toHaveAttribute('aria-expanded', 'false');
  const answer = page.locator('.faq-answer').nth(1);
  await expect(answer).toBeHidden();
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(answer).toBeVisible();
});

/** A hydration mismatch makes React throw away the server HTML and redraw the
 * page (it happened on every page with a phone field). No page error allowed. */
test('public pages hydrate without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const url of ['/', '/services', '/services/' + encodeURIComponent('إرسال-الطرود-والمستندات'), '/contact', '/track', '/about']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});

/** Landing plan, phase 1: the first screen names the next step for a new
 * visitor (services) and, separately, for an existing customer (tracking).
 * Audit plan, batch 1: on phones the tracking step is the code field itself. */
test('home: both journeys are on the first screen, each with one destination', async ({ page }) => {
  await page.goto('/');
  const browse = page.locator('.hero-actions').getByRole('link', { name: 'استعرض الخدمات' });
  await expect(browse).toBeInViewport();
  await expect(browse).toHaveAttribute('href', '/services');
  const form = page.locator('.hero-track form');
  await expect(form).toBeInViewport();
  await expect(form).toHaveAttribute('action', '/track');
  await expect(form.getByLabel('رقم الطلب')).toBeVisible();
  // The link and the band serve larger screens only.
  await expect(page.locator('.hero-actions .hero-track-link')).toBeHidden();
  await expect(page.locator('.tracking-strip')).toBeHidden();
});

/** Audit plan, batch 1: from any page, the tab bar's «تتبع طلبك» opens the code
 * field in a sheet; the name-and-phone lookup stays one link away. */
test('tab bar: «تتبع طلبك» opens the code field in a sheet', async ({ page }) => {
  await page.goto('/services');
  const tab = page.getByRole('navigation', { name: 'التنقل السريع' }).getByRole('link', { name: 'تتبع طلبك' });
  await tab.click();
  const sheet = page.getByRole('dialog', { name: 'تتبع طلبك' });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/\/services$/);
  await expect(sheet.getByRole('link', { name: /باسمك ورقم هاتفك/ })).toHaveAttribute('href', '/track');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(tab).toBeFocused();
  await tab.click();
  await sheet.getByLabel('رقم الطلب').fill('ARJ-NOTREAL1');
  await sheet.getByRole('button', { name: /تتبع طلبك/ }).click();
  await expect(page).toHaveURL(/\/track\?code=ARJ-NOTREAL1/);
  await expect(sheet).toBeHidden();
});

/** Landing plan, phase 2: on phones the default artwork gives way, so the
 * featured services start right after the hero actions. */
test('home (phone): no default artwork before the services', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('.hero-visual:not(.has-image)');
  if (await visual.count()) await expect(visual).toBeHidden();
  const actions = await page.locator('.hero-actions').boundingBox();
  const services = await page.locator('.services-section').boundingBox();
  expect(services!.y - (actions!.y + actions!.height)).toBeLessThan(160);
});

/** Landing plan, phase 3: concrete facts instead of broad reassurance. */
test('home: verifiable facts and what happens after submitting', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-trust').getByRole('link', { name: /تفاصيلك للفريق فقط/ })).toHaveAttribute('href', '/privacy');
  const after = page.getByRole('heading', { name: 'بعد إرسال طلبك' });
  await expect(after).toBeAttached();
  await expect(page.locator('.after-submit li')).toHaveCount(4);
});

/** Landing plan, phase 4: a visible cue that the services row swipes, and a
 * closing action after the FAQ. */
test('home (phone): services row shows its position', async ({ page }) => {
  await page.goto('/');
  const dots = page.locator('.carousel-dots span');
  const cards = await page.locator('.services-section .services-grid > *').count();
  test.skip(cards < 2, 'needs two featured areas');
  test.skip(cards <= 6, 'up to six areas show as a grid, with no row to swipe (audit plan, batch 2)');
  await expect(dots).toHaveCount(cards);
  await expect(dots.nth(0)).toHaveClass('on');
  const row = page.locator('.services-section .services-grid');
  await row.evaluate((el) => el.scrollTo({ left: -el.scrollWidth, behavior: 'instant' }));
  await expect(dots.nth(cards - 1)).toHaveClass('on');
  // Keyboard users reach every card, and focus brings it into view.
  // The card's title link is its keyboard stop.
  const last = page.locator('.services-section .services-grid > *').last().locator('h3 a');
  await last.focus();
  await expect(last).toBeInViewport();
  await expect(page.locator('.services-section').getByRole('link', { name: /كل الخدمات/ })).toBeVisible();
});

test('home: closing action leads to services and a contact route', async ({ page }) => {
  await page.goto('/');
  const closing = page.locator('.closing-cta');
  await closing.scrollIntoViewIfNeeded();
  await expect(closing.getByRole('link', { name: /ابدأ طلبك/ })).toHaveAttribute('href', '/services');
  const contact = closing.getByRole('link', { name: /WhatsApp|تواصل معنا/ });
  await expect(contact).toHaveAttribute('href', /^(https:\/\/wa\.me\/|\/contact$)/);
  // Nothing fixed hides the end of the page: at the bottom, the last footer
  // content sits above the tab bar and the WhatsApp button.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const bar = await page.locator('.tab-bar').boundingBox();
  const end = await page.locator('footer').evaluate((f) => {
    const kids = Array.from(f.querySelectorAll('a, p, span')).filter((e) => e.getClientRects().length);
    return Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
  });
  expect(end).toBeLessThanOrEqual(bar!.y);
});

test('phone: fixed bars step aside while typing, without stealing the submit tap', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.tab-bar');
  await expect(bar).toBeVisible();
  const form = page.locator('.hero-track');
  await form.getByLabel('رقم الطلب').fill('ARJ-NOTREAL1');
  await expect(bar).toBeHidden();
  // The button may sit where the bar returns; the tap must still submit.
  await form.getByRole('button', { name: /تتبع طلبك/ }).click();
  await expect(page).toHaveURL(/\/track\?code=ARJ-NOTREAL1/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(bar).toBeVisible();
});

/** Audit plan, batch 2: the compact card keeps what identifies the area (a stamp
 * plate with the icon when there is no image, the centred title, the count and
 * two lines of description) and drops the long-card extras; the whole card is
 * one link. The card's title still says which area it is. */
test('home (phone): compact area cards are whole links with a stamp, title, count and description', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.services-section .compact-cards .category-card').first();
  test.skip(!(await card.count()), 'needs the compact grid (six areas or fewer)');
  await expect(card.locator('.art-stamp, .service-custom-image').first()).toBeVisible();
  await expect(card.locator('.service-body small')).toBeVisible();
  await expect(card.locator('.service-body p')).toBeVisible();
  await expect(card.getByRole('link', { name: 'استعرض الخدمات' })).toBeHidden();
  const title = card.locator('h3');
  expect(await title.evaluate((h) => getComputedStyle(h).textAlign)).toBe('center');
  const box = (await card.boundingBox())!;
  expect(box.height, 'a compact card').toBeLessThan(260);
  // Tapping the description area (not just the title) opens the area: the
  // title's link covers the whole card.
  const p = (await card.locator('.service-body p').boundingBox())!;
  await card.click({ position: { x: p.x - box.x + p.width / 2, y: p.y - box.y + p.height / 2 } });
  await expect(page).toHaveURL(/\/services\/category\//);
});

/** Design batch 1: on a common phone the first main card shows above the tab
 * bar on the first screen, under the hero's action and its tracking field. */
test('home (phone): the first main card starts on the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const bar = await page.locator('.tab-bar').boundingBox();
  const card = await page.locator('.services-section .category-card').first().boundingBox();
  expect(bar!.y - card!.y, 'at least 150px of the first card above the tab bar').toBeGreaterThanOrEqual(150);
  const browse = await page.locator('.hero-actions .button').first().boundingBox();
  const track = await page.locator('.hero-track').boundingBox();
  expect(track!.y, 'the code field right under the services action').toBeGreaterThan(browse!.y + browse!.height - 1);
  expect(track!.y - (browse!.y + browse!.height)).toBeLessThan(24);
});
