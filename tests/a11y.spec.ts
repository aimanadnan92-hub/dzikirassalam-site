// Accessibility: automated WCAG 2.1 AA scan (axe-core) of every page, keyboard use, reduced motion.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, PAGES } from './site';

for (const path of PAGES) {
  test(`axe WCAG 2.1 AA: ${path}`, async ({ page }, info) => {
    test.skip(!['desktop', 'mobile'].includes(info.project.name), 'one wide and one narrow scan per page');
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    expect(summary).toEqual([]);
  });
}

test('keyboard: the first Tab reveals "skip to content", which jumps past the header', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard test');
  await page.goto('/rawatan/');
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#kandungan$/);
});

test('keyboard: focus is always visible on links and buttons', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard test');
  await page.goto('/');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return { tag: el.tagName, style: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
    });
    expect(outline.style !== 'none' && outline.width > 0 || outline.shadow !== 'none', `focus ring on ${outline.tag} #${i + 1}`).toBe(true);
  }
});

test('reduced motion: every step is shown at once, no scroll-driven reveal', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('umami.disabled', '1'));
  await page.goto('/rawatan/');
  const steps = page.locator('.steps > li');
  const n = await steps.count();
  expect(n).toBeGreaterThan(0);
  await expect(page.locator('.steps > li.is-lit')).toHaveCount(n);
  await ctx.close();
});
