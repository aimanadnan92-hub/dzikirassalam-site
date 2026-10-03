// The journey the site exists for: visitor understands the service, picks a path, contacts or books.
// Checks every main action is visible, goes to the right place with the right pre-written message,
// and is measured with the right analytics event.
import { expect, test, TIKTOK_LIVE, TIKTOK_SHOP, WA_MAIN, holdExternalLinks } from './site';

const waText = (href: string | null) => {
  const u = new URL(href!);
  expect(u.hostname).toBe('wa.me');
  expect(u.pathname).toBe('/' + WA_MAIN);
  return u.searchParams.get('text') || '';
};

test('homepage: RM150 booking is the first, visible action and opens WhatsApp with the RM150 message', async ({ page }) => {
  await page.goto('/');
  const book = page.locator('.hero [data-offer="rdt-1"]');
  await expect(book).toBeVisible();
  await expect(book).toBeInViewport();
  await expect(book).toContainText('RM150');
  await expect(book).toHaveAttribute('target', '_blank');
  await expect(book).toHaveAttribute('rel', /noopener/);
  expect(waText(await book.getAttribute('href'))).toContain('Ikhtiar Rawatan Personal RM150');
  // Comfortable to tap.
  const box = await book.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('homepage: free TikTok Live path leads to the TikTok account and the WhatsApp Group', async ({ page }) => {
  await page.goto('/');
  const free = page.locator('.hero [data-cta="hero-live"]');
  await expect(free).toBeVisible();
  await free.click();
  await expect(page.locator('#live')).toBeInViewport();
  await expect(page.locator('#live a[data-cta="live-follow"]')).toHaveAttribute('href', TIKTOK_LIVE);
  await expect(page.locator('#live a[data-cta="live-group"]')).toHaveAttribute('href', /^https:\/\/chat\.whatsapp\.com\/\w+/);
});

test('package: RM399 package is offered on the homepage and /rawatan/#pakej with the package message', async ({ page }) => {
  for (const path of ['/', '/rawatan/#pakej']) {
    await page.goto(path);
    const pkg = page.locator('#pakej [data-offer="rdt-3"]');
    await pkg.scrollIntoViewIfNeeded();
    await expect(pkg).toBeVisible();
    await expect(page.locator('#pakej')).toContainText('RM399');
    expect(waText(await pkg.getAttribute('href'))).toContain('pakej 3 Sesi Rawatan Dzikir Terapi RM399');
  }
});

test('every RM150 button on the site carries the RM150 message', async ({ page, request }) => {
  for (const path of ['/', '/rawatan/', '/perjalanan/', '/tentang/', '/faq/', '/tiktok-live/']) {
    await page.goto(path);
    const hrefs = await page.locator('a[data-offer="rdt-1"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.length, `RM150 buttons on ${path}`).toBeGreaterThan(0);
    for (const h of hrefs) expect(waText(h)).toContain('RM150');
  }
});

test('products link goes to the products TikTok, not the Live account', async ({ page }) => {
  await page.goto('/produk/');
  await expect(page.locator('[data-cta="air-dzikir"]')).toHaveAttribute('href', TIKTOK_SHOP);
});

test('sedekah buttons go to the CHIP payment pages', async ({ page }) => {
  await page.goto('/sedekah/');
  await expect(page.locator('[data-cta="sedekah-sbb"]')).toHaveAttribute('href', 'https://pay.chip-in.asia/salamberkatbox');
  await expect(page.locator('[data-cta="sedekah-tahfiz"]')).toHaveAttribute('href', 'https://pay.chip-in.asia/madrasahtahfiz');
});

test('phone dock: booking stays one tap away after the hero, and steps aside at the final call', async ({ page }, info) => {
  test.skip(!['mobile', 'iphone'].includes(info.project.name), 'the dock is a phone feature');
  await page.goto('/rawatan/');
  const dock = page.locator('[data-dock]');
  await expect(dock).not.toHaveClass(/is-shown/);
  await page.locator('#pakej').scrollIntoViewIfNeeded();
  await expect(dock).toHaveClass(/is-shown/);
  const book = dock.locator('[data-dock-state="book"]');
  await expect(book).toBeVisible();
  expect(waText(await book.getAttribute('href'))).toContain('RM150');
  for (const el of [book, dock.locator('.dock-ask')]) {
    const b = await el.boundingBox();
    expect(b!.height, 'dock tap target height').toBeGreaterThanOrEqual(44);
  }
  // Dock and its buttons do not overlap each other.
  const [a, w] = [await book.boundingBox(), await dock.locator('.dock-ask').boundingBox()];
  expect(a!.x + a!.width).toBeLessThanOrEqual(w!.x + 0.5);
  await page.locator('.final').scrollIntoViewIfNeeded();
  await expect(dock).not.toHaveClass(/is-shown/);
});

test.describe('analytics', () => {
  test('nothing is loaded or sent when there is no website id, or the visitor opted out', async ({ page }) => {
    // The shared fixture sets the opt-out flag, so this holds on the live site even with analytics on.
    const calls: string[] = [];
    page.on('request', (r) => { if (/umami/.test(r.url())) calls.push(r.url()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(calls).toEqual([]);
  });

  test('each main action sends its named event, with no URLs or message text', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'event mapping is the same on every screen');
    // Turn analytics on with a test id and stand in for the Umami script (nothing leaves the machine).
    await page.route('**/assets/js/config.js', async (route) => {
      const body = (await (await route.fetch()).text()).replace('umamiWebsiteId: null', 'umamiWebsiteId: "test-site"');
      await route.fulfill({ body, contentType: 'application/javascript' });
    });
    await page.route('https://cloud.umami.is/script.js', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: 'window.__events = []; window.umami = { track: (n, d) => window.__events.push([n, d]) };',
    }));
    await holdExternalLinks(page);
    await page.addInitScript(() => localStorage.removeItem('umami.disabled'));
    await page.goto('/');
    await page.waitForFunction(() => (window as any).umami);

    await page.locator('.hero [data-offer="rdt-1"]').click();
    await page.locator('#live a[data-cta="live-follow"]').click();
    await page.locator('#live a[data-cta="live-group"]').click();
    await page.locator('#pakej [data-offer="rdt-3"]').click();
    await page.locator('.site-footer a[href^="https://wa.me/601140344764"]').click();
    await page.locator('.site-footer a[href="https://www.youtube.com/@RawatanDzikirAs-Salam"]').click();

    const events = await page.evaluate(() => (window as any).__events);
    expect(events.map((e: any) => [e[0], e[1].location])).toEqual([
      ['cta_treatment_rm150', 'hero'],
      ['cta_tiktok_free_treatment', 'live-follow'],
      ['cta_whatsapp_group', 'live-group'],
      ['cta_package_3_session', 'pkg'],
      ['cta_whatsapp_click', 'footer'],
      ['outbound_click', 'footer'],
    ]);
    for (const [, data] of events) expect(data.page).toBe('home');
    const sent = JSON.stringify(events);
    expect(sent).not.toMatch(/wa\.me|Assalamualaikum|chat\.whatsapp\.com|\?text=/);
  });
});
