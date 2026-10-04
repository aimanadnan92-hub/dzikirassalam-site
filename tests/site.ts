// Facts the tests check the site against. If one of these changes on purpose, change it here.
import { test as base, type Page } from '@playwright/test';

export { expect } from '@playwright/test';

// Every test page opts out of analytics, so test runs against the live site are never counted as visitors.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => { try { localStorage.setItem('umami.disabled', '1'); } catch (e) {} });
    await use(page);
  },
});

export const PROD = 'https://dzikirassalam.com';
export const WA_MAIN = '60137030155';
export const TIKTOK_LIVE = 'https://www.tiktok.com/@rawatan.assalam';
export const TIKTOK_SHOP = 'https://www.tiktok.com/@rawatanassalam2';

// Every public page (the sitemap must list exactly these).
export const PAGES = [
  '/', '/faq/', '/majelis/', '/perjalanan/', '/produk/', '/rawatan/', '/sedekah/', '/talqin/', '/tentang/', '/tiktok-live/',
  '/privacy/', '/refund-policy/', '/terms/',
];

export const isProd = (baseURL?: string) => !!baseURL && !baseURL.includes('127.0.0.1');

/** Collects console errors, uncaught exceptions and CSP violations while a page is used. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Stops external links from leaving the page during a test (the click still fires every listener). */
export async function holdExternalLinks(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (a && (a.target === '_blank' || a.origin !== location.origin)) e.preventDefault();
    }, true);
  });
}
