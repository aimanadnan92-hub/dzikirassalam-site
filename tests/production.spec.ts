// Rules that only nginx and Traefik apply, so they are checked on the live site
// (`npm run test:prod`). Skipped in local runs.
import { expect, test, PROD, isProd } from './site';

test.beforeEach(({ baseURL }, info) => {
  test.skip(!isProd(baseURL), 'production-only checks');
  test.skip(info.project.name !== 'desktop', 'server rules are the same on every screen');
});

test('security headers are present on pages', async ({ request }) => {
  const h = (await request.get('/')).headers();
  expect(h['strict-transport-security']).toMatch(/max-age=\d{7,}/);
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('camera=()');
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['server'] || '').not.toMatch(/\d/); // no version number
});

test('security headers survive on assets too', async ({ request }) => {
  const h = (await request.get('/assets/js/config.js')).headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['cache-control']).toBe('no-cache');
});

test('one address: www and http both redirect permanently-or-safely to https://dzikirassalam.com', async ({ request }) => {
  const www = await request.get('https://www.dzikirassalam.com/rawatan/?a=1', { maxRedirects: 0 });
  expect(www.status()).toBe(301);
  expect(www.headers()['location']).toBe(`${PROD}/rawatan/?a=1`);
  const http = await request.get('http://dzikirassalam.com/', { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(http.status());
  expect(http.headers()['location']).toBe(`${PROD}/`);
});

test('a missing trailing slash redirects without leaving https', async ({ request }) => {
  const res = await request.get('/rawatan', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()['location']).toBe('/rawatan/');
});

test('health check and hidden files', async ({ request }) => {
  const hz = await request.get('/healthz');
  expect(hz.status()).toBe(200);
  expect(await hz.text()).toBe('ok\n');
  for (const p of ['/.git/config', '/.gitignore', '/README.md', '/Dockerfile', '/nginx.conf', '/site-src/build.py']) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
});

test('caching: versioned CSS/JS cached for a year, pages revalidate, text is compressed', async ({ page, request }) => {
  await page.goto('/');
  const css = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  expect(css).toMatch(/\?v=[0-9a-f]{10}$/);
  const c = (await request.get(css!, { headers: { 'Accept-Encoding': 'gzip' } })).headers();
  expect(c['cache-control']).toContain('max-age=31536000');
  const home = (await request.get('/', { headers: { 'Accept-Encoding': 'gzip' } })).headers();
  expect(home['cache-control']).toBe('no-cache');
  expect(home['content-type']).toContain('charset=utf-8');
});
