// The site-wide footer: the three policy pages, every WhatsApp contact, confirmed social channels only.
import { expect, test, PAGES, WA_MAIN } from './site';

const POLICIES = [
  ['/privacy/', 'Notis Privasi'],
  ['/refund-policy/', 'Polisi Pembatalan'],
  ['/terms/', 'Terma'],
];
// Numbers from the CHIP policy brief (4 Oct 2026). The main line opens with a prefilled message.
const TEAM = [
  ['601140344764', 'Solah'],
  ['60103648864', 'Firdaus'],
  ['60169341909', 'Anuar'],
  ['60162880503', 'Asma'],
];

test('policy links are visible in the footer and open their pages', async ({ page }) => {
  for (const [href, heading] of POLICIES) {
    await page.goto('/');
    const link = page.locator(`.foot-legal a[href="${href}"]`);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('h1')).toContainText(heading);
  }
});

test('footer lists all five WhatsApp contacts, email and location', async ({ page }) => {
  await page.goto('/');
  const foot = page.locator('.site-footer');
  await expect(foot.locator(`a[href^="https://wa.me/${WA_MAIN}?text="]`)).toHaveCount(1);
  for (const [n, name] of TEAM) {
    const a = foot.locator(`a[href="https://wa.me/${n}"]`);
    await expect(a).toHaveCount(1);
    await expect(a).toContainText(name);
  }
  await expect(foot.locator('a[href="mailto:admin@dzikirassalam.com"]')).toHaveCount(1);
  await expect(foot).toContainText('SSM 202603062910 (KT0609580-A)');
  await expect(foot).toContainText('3000A, Jalan Sultan Azlan Shah');
});

test('footer social channels are the confirmed ones only, and no page names the wrong spellings', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const html = await page.content();
    expect(html, `${path}: Facebook link`).not.toMatch(/facebook\.com/i);
    expect(html, `${path}: old spellings`).not.toMatch(/\b(Soleh|Asmae|Sodakoh)\b/);
    const hosts = await page.locator('.foot-social a').evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hostname));
    expect(hosts).toEqual(['www.tiktok.com', 'www.youtube.com', 'linktr.ee']);
  }
});

test('policy pages show the business identity and switch language', async ({ page }) => {
  for (const [href] of POLICIES) {
    await page.goto(href);
    const card = page.locator('.policy-card').first();
    await expect(card).toContainText('Dzikir Assalam Worldwide');
    await expect(card).toContainText('202603062910 (KT0609580-A)');
    await expect(card).toContainText('Gelugor');
    await expect(page.locator('.policy-doc > .ms')).toBeVisible();
    await expect(page.locator('.policy-doc > .en')).toBeHidden();
  }
  await page.evaluate(() => { localStorage.setItem('assalam-lang', 'en'); });
  await page.goto('/terms/');
  await expect(page.locator('.policy-doc > .en')).toBeVisible();
  await expect(page.locator('.policy-doc > .ms')).toBeHidden();
  await expect(page.locator('h1')).toContainText('Terms');
});

test('footer shows the full address and the appointment-only note', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('.foot-contact.is-address');
  await expect(row).toContainText('3000A, Jalan Sultan Azlan Shah');
  await expect(row).toContainText('11700 Gelugor');
  await expect(row).toContainText('Rawatan bersemuka melalui temujanji sahaja');
});

// The CHIP donation links are payment destinations: they must never change by accident.
test('sedekah: CHIP links unchanged, donation status and terms link present (BM and EN)', async ({ page }) => {
  await page.goto('/sedekah/');
  await expect(page.locator('a[href="https://pay.chip-in.asia/salamberkatbox"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://pay.chip-in.asia/madrasahtahfiz"]')).toHaveCount(1);
  const box = page.locator('.donation-terms');
  await expect(box).toContainText('sukarela sepenuhnya');
  await expect(box).toContainText('tidak layak dituntut sebagai pelepasan atau potongan cukai pendapatan');
  await box.locator('a[href="/terms/#derma"]').click();
  await expect(page).toHaveURL('/terms/#derma');
  await expect(page.locator('#derma')).toBeVisible();

  await page.evaluate(() => { localStorage.setItem('assalam-lang', 'en'); });
  await page.goto('/sedekah/');
  await expect(page.locator('.donation-terms')).toContainText('not currently eligible to be claimed as income tax relief');
  await page.locator('.donation-terms a[href="/terms/#donations"]').click();
  await expect(page.locator('#donations')).toBeVisible();
});

test('terms cover donations and monthly programmes separately from treatment refunds', async ({ page }) => {
  await page.goto('/terms/');
  await expect(page.locator('#derma')).toContainText('Sedekah dan sumbangan');
  await expect(page.locator('#program-bulanan')).toContainText('Program bulanan');
  const doc = page.locator('.policy-doc > .ms');
  await expect(doc).toContainText('Program Kuliah Hakikat dan Program Dzikir Pembuka Pintu Rezeki');
  await expect(doc).not.toContainText('tersedia di checkout');
  await page.goto('/refund-policy/');
  await expect(page.locator('.policy-doc > .ms')).toContainText('pautan pembayaran yang dihantar oleh pasukan kami');
  await expect(page.locator('.policy-doc > .ms')).toContainText('RM133 bagi setiap sesi yang belum digunakan');
});
