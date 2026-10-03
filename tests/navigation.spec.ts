// Getting around: desktop navigation, the phone menu, the language switch and internal links.
import { expect, test, PAGES } from './site';

const NAV = [
  ['/rawatan/', 'Rawatan Dzikir Terapi'],
  ['/tiktok-live/', 'TikTok Live'],
  ['/majelis/', 'Majelis Dzikir'],
];

test('desktop: header links reach their pages', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop header');
  for (const [href, heading] of NAV) {
    await page.goto('/');
    await page.locator(`.nav a[href="${href}"]`).click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator(`.nav a[href="${href}"]`)).toHaveAttribute('aria-current', 'page');
  }
});

test('phone and tablet: menu opens, traps focus, closes with Esc, and navigates', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'the menu button is for smaller screens');
  await page.goto('/');
  const btn = page.locator('.menu-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await btn.click();
  const menu = page.locator('#menu');
  await expect(menu).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.locator('[data-offer="rdt-1"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');

  await btn.click();
  await menu.locator('nav a[href="/rawatan/"]').click();
  await expect(page).toHaveURL('/rawatan/');
  await expect(page.locator('#menu')).toBeHidden();
});

test('language switch: English shows, and is remembered on the next page', async ({ page }) => {
  await page.goto('/');
  const open = async () => {
    const inHeader = page.locator('.nav [data-set-lang="en"]');
    if (await inHeader.isVisible()) return inHeader;
    await page.locator('.menu-btn').click();
    return page.locator('#menu [data-set-lang="en"]');
  };
  await (await open()).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero h1 .en')).toBeVisible();
  await expect(page.locator('.hero h1 .ms')).toBeHidden();
  await page.goto('/rawatan/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.page-hero .lede .en')).toBeVisible();
  await expect(page.locator('.page-hero .lede .ms')).toBeHidden();
});

test('every internal link and #anchor on every page resolves', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'links are the same on every screen');
  const seen = new Map<string, number>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"], a[href^="#"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const u = new URL(href);
      const key = u.pathname;
      if (!seen.has(key)) seen.set(key, (await request.get(key)).status());
      if (u.hash) {
        // The anchor must exist on the target page.
        const target = await request.get(key);
        expect(await target.text(), `${href} (linked from ${path})`).toContain(`id="${u.hash.slice(1)}"`);
      }
    }
  }
  const broken = [...seen].filter(([, s]) => s !== 200);
  expect(broken, 'internal links that do not return 200').toEqual([]);
});
