import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { THEME_NAMES } from '../../src/tokens/themes.ts';

// AppShell's sidebar ↔ icon rail, from lg up, in every theme.
test.use({ viewport: { width: 1280, height: 800 } });

async function open(page: Page, theme: string) {
  await page.goto(`/?theme=${theme}`);
  await page.locator('h1').waitFor();
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const theme of THEME_NAMES) {
  test(`${theme}: toggle collapses to the rail and back, axe clean in both states`, async ({ page }) => {
    await open(page, theme);
    const sidebar = page.locator('#sidebar');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const toggle = page.getByRole('button', { name: 'Collapse sidebar' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-controls', 'sidebar');
    expect((await sidebar.boundingBox())?.width).toBe(240);
    await axe(page);

    await toggle.click();
    const expand = page.getByRole('button', { name: 'Expand sidebar' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect((await sidebar.boundingBox())?.width).toBe(56);
    // The rail keeps every label in the accessible name.
    for (const name of ['Inbox 3', 'Contacts', 'Reports', 'Settings']) {
      await expect(nav.getByRole('link', { name })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Inbox 3' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Contacts' })).not.toHaveAttribute('aria-current');
    await axe(page);

    await expand.click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true');
    expect((await sidebar.boundingBox())?.width).toBe(240);
  });

  test(`${theme}: sidebar targets are at least 44×44, in both states`, async ({ page }) => {
    await open(page, theme);
    for (const state of ['expanded', 'rail']) {
      if (state === 'rail') await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      const small = await page.locator('#sidebar').locator('a[href], button').evaluateAll((els) =>
        els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { name: el.getAttribute('aria-label') ?? el.textContent?.trim(), w: r.width, h: r.height };
          })
          .filter((t) => t.w < 44 || t.h < 44),
      );
      expect(small, state).toEqual([]);
    }
  });
}

test('rail items show their label as a tooltip on hover and on focus', async ({ page }) => {
  await open(page, 'day');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contacts' });
  await link.hover();
  await expect(page.getByRole('tooltip').first()).toHaveText('Contacts');
  // A real pointer leaves in steps; a single jump never crosses the grace area.
  await page.mouse.move(700, 400, { steps: 10 });
  await expect(page.getByRole('tooltip')).toBeHidden();
  await link.focus();
  await expect(page.getByRole('tooltip').first()).toHaveText('Contacts');
});

test('the choice survives a reload', async ({ page }) => {
  await open(page, 'day');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.reload();
  await page.locator('h1').waitFor();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  expect((await page.locator('#sidebar').boundingBox())?.width).toBe(56);
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.reload();
  await page.locator('h1').waitFor();
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
});

test('the sidebar stays in view while the page scrolls, and content is padded for it', async ({ page }) => {
  await open(page, 'day');
  const main = await page.locator('main').boundingBox();
  expect(main?.x).toBeGreaterThanOrEqual(240);
  await page.evaluate(() => window.scrollTo(0, 600));
  const box = await page.locator('#sidebar').boundingBox();
  expect(box?.y).toBe(56);
});

test('below lg the sidebar is not rendered', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await open(page, 'day');
  await expect(page.locator('#sidebar')).toBeHidden();
});
