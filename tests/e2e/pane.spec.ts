import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { THEME_NAMES } from '../../src/tokens/themes.ts';

// AppShell's inline pane (from lg up) and bottom tabs (below lg), in every theme.
// `tabs` turns the playground's bottom bar on: the default audits run without it.
async function open(page: Page, theme: string, width: number, height = 800, tabs = false) {
  await page.setViewportSize({ width, height });
  await page.goto(`/?theme=${theme}${tabs ? '&tabs=1' : ''}`);
  await page.locator('h1').waitFor();
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const theme of THEME_NAMES) {
  test(`${theme}: pane is 400px, content clears it, close returns focus to the toggle, axe clean`, async ({ page }) => {
    await open(page, theme, 1280);
    const toggle = page.getByRole('button', { name: 'Details panel' });
    await expect(toggle).toHaveAttribute('aria-controls', 'pane');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#pane')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const pane = page.getByRole('complementary', { name: 'Details' });
    await expect(pane).toBeVisible();
    expect((await pane.boundingBox())?.width).toBe(400);
    // main's content box ends where the pane starts.
    const main = await page.locator('main').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { right: r.right };
    });
    expect(main.right).toBeLessThanOrEqual(1280 - 400);
    await axe(page);

    await page.getByRole('button', { name: 'Hide panel' }).click();
    await expect(page.locator('#pane')).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test(`${theme}: below lg the pane toggle is hidden; the tabs show with the current one marked, 44px, axe clean`, async ({ page }) => {
    await open(page, theme, 800, 800, true);
    await expect(page.getByRole('button', { name: 'Details panel' })).toBeHidden();
    await expect(page.locator('#pane')).toHaveCount(0);
    const tabs = page.getByRole('navigation', { name: 'Tabs' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    await expect(tabs.getByRole('link', { name: 'Reports' })).not.toHaveAttribute('aria-current');
    const small = await tabs.locator('a').evaluateAll((els) =>
      els
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { name: el.textContent, w: r.width, h: r.height };
        })
        .filter((t) => t.w < 44 || t.h < 44),
    );
    expect(small).toEqual([]);
    // Scoped to the bar: the page's own targets under it are the scroll-padding test's business.
    const { violations } = await new AxeBuilder({ page })
      .include('nav[aria-label="Tabs"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
      .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
}

test('the last content line is not under the tab bar when scrolled to the bottom', async ({ page }) => {
  await open(page, 'day', 800, 800, true);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const { barTop, mainBottom, barBottom } = await page.evaluate(() => {
    const bar = document.querySelector('nav[aria-label="Tabs"]')!.getBoundingClientRect();
    const main = document.querySelector('main')!.getBoundingClientRect();
    return { barTop: bar.top, mainBottom: main.bottom, barBottom: bar.bottom };
  });
  expect(mainBottom).toBeLessThanOrEqual(barTop);
  expect(barBottom).toBe(800);
});

test('from lg up the tabs are not rendered visibly', async ({ page }) => {
  await open(page, 'day', 1280, 800, true);
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.style.scrollPaddingBottom)).toBe('0px');
});

test('320px / 200% zoom has no horizontal scroll with the tabs', async ({ page }) => {
  await open(page, 'day', 320, 256, true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
});

test('2.4.12: Tab never lands a focused element under the tab bar', async ({ page }) => {
  await open(page, 'day', 800, 800, true);
  const padding = await page.evaluate(() => document.documentElement.style.scrollPaddingBottom);
  expect(parseFloat(padding)).toBeGreaterThan(0);
  const count = await page.evaluate(
    () => Array.from(document.querySelectorAll('main a[href], main button, main input, main select, main textarea')).filter((el) => el.getClientRects().length > 0).length,
  );
  expect(count).toBeGreaterThan(10);
  // Walk the whole tab order; every stop inside main must clear the bar.
  for (let i = 0; i < count + 8; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const bar = document.querySelector('nav[aria-label="Tabs"]')!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { inMain: !!el.closest('main'), name: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30), bottom: r.bottom, barTop: bar.top };
    });
    if (stop.inMain) expect(stop.bottom, `${stop.name} under the bar`).toBeLessThanOrEqual(stop.barTop);
  }
});
