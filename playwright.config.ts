import { defineConfig, devices } from '@playwright/test';

// `npm test` builds site/ and tests it on a local server.
// `npm run test:prod` (or BASE_URL=...) tests the live site instead, including nginx-only rules.
const PROD_URL = 'https://dzikirassalam.com';
const BASE_URL = process.env.BASE_URL || (process.env.npm_lifecycle_event === 'test:prod' ? PROD_URL : '');
const LOCAL = !BASE_URL;

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  fullyParallel: true,
  retries: LOCAL ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: LOCAL ? { command: 'node tests/server.mjs', url: 'http://127.0.0.1:4173/healthz', reuseExistingServer: true } : undefined,
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Aiman's own phone is an iPhone: WebKit is the closest engine to iOS Safari.
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
});
