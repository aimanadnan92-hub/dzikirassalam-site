// Search engines: robots.txt, sitemap, real 404s, structured data that matches the page.
import { expect, test, PAGES, PROD } from './site';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server files are the same on every screen'));

test('robots.txt allows everything and points to the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-agent: \*\s+Allow: \//);
  expect(body).not.toMatch(/Disallow: \/\s*$/m);
  expect(body).toContain(`Sitemap: ${PROD}/sitemap.xml`);
});

test('sitemap lists exactly the public pages, on the production domain', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const locs = [...(await res.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(locs.sort()).toEqual(PAGES.map((p) => PROD + p).sort());
});

test('an unknown address returns a real 404 page that is not indexed and offers a way back', async ({ page }) => {
  const res = await page.goto('/tiada-halaman-ini/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('tidak ditemui');
  await expect(page.locator('main a[href="/"]')).toBeVisible();
  await expect(page.locator('main [data-offer="rdt-1"]')).toBeVisible();
});

test('favicon.ico exists (browsers and crawlers ask for it)', async ({ request }) => {
  const res = await request.get('/favicon.ico');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/icon/);
});

test('homepage structured data parses and describes only what the page shows', async ({ page }) => {
  await page.goto('/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  const data = JSON.parse(blocks[0]);
  expect(data['@type']).toBe('LocalBusiness');
  expect(data.url).toBe(PROD + '/');
  expect(data.telephone).toBe('+60137030155');
  expect(data.makesOffer.map((o: any) => o.price)).toEqual(['150', '399']);
  const text = await page.locator('main').innerText();
  expect(text).toContain('RM150');
  expect(text).toContain('RM399');
  // No ratings or reviews unless real ones exist on the page.
  expect(blocks[0]).not.toMatch(/aggregateRating|review/i);
});

test('detail pages carry a breadcrumb that matches their visible trail', async ({ page }) => {
  for (const path of PAGES.filter((p) => p !== '/')) {
    await page.goto(path);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks, path).toHaveLength(1);
    const data = JSON.parse(blocks[0]);
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement[1].item).toBe(PROD + path);
    await expect(page.locator('.crumbs')).toContainText(data.itemListElement[1].name);
  }
});

test('page titles and descriptions are unique', async ({ page }) => {
  const titles = new Set<string>();
  const descs = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    titles.add(await page.title());
    descs.add((await page.locator('meta[name="description"]').getAttribute('content'))!);
  }
  expect(titles.size).toBe(PAGES.length);
  expect(descs.size).toBe(PAGES.length);
});
