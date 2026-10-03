// Every page, at every screen size: loads, has one clear heading, correct metadata, no script or
// security-policy errors, no sideways scrolling and no clipped text, in both languages.
import { expect, test, PAGES, PROD, watchErrors } from './site';

for (const path of PAGES) {
  test.describe(`page ${path}`, () => {
    test('loads cleanly with correct metadata', async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      expect((await page.title()).length).toBeGreaterThan(10);

      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc?.length, 'meta description length').toBeGreaterThan(50);
      expect(desc!.length, 'meta description length').toBeLessThan(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', PROD + path);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', PROD + path);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/dzikirassalam\.com\/assets\/img\/og-v8\.jpg$/);
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

      // Every image says what it is (or is marked decorative with alt="").
      const missingAlt = await page.locator('img:not([alt])').count();
      expect(missingAlt, 'images without alt').toBe(0);

      await page.waitForLoadState('networkidle');
      expect(errors, 'console errors, script errors or CSP violations').toEqual([]);
    });

    for (const lang of ['ms', 'en'] as const) {
      test(`no sideways scroll or clipped buttons (${lang})`, async ({ page }) => {
        await page.goto(path);
        if (lang === 'en') {
          // The switch sits in the header on wide screens and inside the menu on phones.
          const inHeader = page.locator('.nav [data-set-lang="en"]');
          if (await inHeader.isVisible()) await inHeader.click();
          else { await page.locator('.menu-btn').click(); await page.locator('#menu [data-set-lang="en"]').click(); await page.keyboard.press('Escape'); }
          await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'page wider than the screen (px)').toBeLessThanOrEqual(0);

        // Visible buttons must show their whole label (no text cut off inside the pill).
        const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main .btn')]
          .filter((b) => b.offsetParent && b.getClientRects().length)
          .filter((b) => b.scrollWidth > b.clientWidth + 1)
          .map((b) => b.textContent?.trim()));
        expect(clipped, 'buttons whose label is cut off').toEqual([]);
      });
    }
  });
}
