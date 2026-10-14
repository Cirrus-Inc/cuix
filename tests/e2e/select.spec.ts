import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, theme = 'day') {
  await page.goto(`/?theme=${theme}`);
  await page.locator('h1').waitFor();
}

test('Select: label focuses the trigger, hint and error are wired', async ({ page }) => {
  await open(page);
  await page.getByText('Country', { exact: true }).click();
  const country = page.getByRole('combobox', { name: 'Country' });
  await expect(country).toBeFocused();
  // Like a native select, the label focuses the control; it does not open it.
  await expect(country).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(country).toHaveAccessibleDescription('Where invoices are issued.');
  await expect(country).toHaveText('Argentina');
  const region = page.getByRole('combobox', { name: 'Region' });
  await expect(region).toHaveAttribute('aria-invalid', 'true');
  await expect(region).toHaveAccessibleDescription('Pick a region.');
  await expect(region).toHaveText('Choose a region');
});

test('Select: keyboard opens, moves, selects and returns focus', async ({ page }) => {
  await open(page);
  const country = page.getByRole('combobox', { name: 'Country' });
  await country.focus();
  await page.keyboard.press('Enter');
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  // Radix ignores keys until the popup is positioned and focus is in it.
  await expect(list.getByRole('option', { name: 'Argentina' })).toBeFocused();
  // Brazil is disabled: ArrowDown lands on the next enabled option.
  await page.keyboard.press('ArrowDown');
  await expect(list.getByRole('option', { name: 'United States' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(country).toHaveText('United States');
  await expect(country).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(list.getByRole('option', { name: 'United States' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(list.getByRole('option', { name: 'Argentina' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(country).toHaveText('United States');
  await expect(country).toBeFocused();
});

test('Select: type-ahead and 44px items', async ({ page }) => {
  await open(page);
  const country = page.getByRole('combobox', { name: 'Country' });
  await country.focus();
  await page.keyboard.press('ArrowDown');
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option', { name: 'Argentina' })).toBeFocused();
  const heights = await list.getByRole('option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights.every((h) => h >= 44)).toBe(true);
  await page.keyboard.type('u');
  await expect(list.getByRole('option', { name: 'United States' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(country).toHaveText('United States');
});

test('Select: mouse selection', async ({ page }) => {
  await open(page);
  const region = page.getByRole('combobox', { name: 'Region' });
  await region.click();
  await page.getByRole('option', { name: 'South America' }).click();
  await expect(region).toHaveText('South America');
});

test('Select: Tab stays in the open list', async ({ page }) => {
  await open(page);
  const country = page.getByRole('combobox', { name: 'Country' });
  await country.focus();
  await page.keyboard.press('Enter');
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option', { name: 'Argentina' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(list.getByRole('option', { name: 'Argentina' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(country).toBeFocused();
});

for (const theme of ['day', 'night', 'hive-day', 'hive-night'] as const) {
  test(`Select popup is axe clean in ${theme}`, async ({ page }) => {
    await open(page, theme);
    await page.getByRole('combobox', { name: 'Country' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox').getByRole('option', { name: 'Argentina' })).toBeFocused();
    const { violations } = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('Select in forced colors: selected item is Highlight, keyboard position keeps a ring', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);
  const country = page.getByRole('combobox', { name: 'Country' });
  await country.focus();
  await page.keyboard.press('Enter');
  const list = page.getByRole('listbox');
  const argentina = list.getByRole('option', { name: 'Argentina' });
  await expect(argentina).toBeFocused();
  const highlight = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'Highlight';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(await argentina.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(highlight);
  await page.keyboard.press('ArrowDown');
  const us = list.getByRole('option', { name: 'United States' });
  await expect(us).toBeFocused();
  const ring = await us.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth };
  });
  expect(ring).toEqual({ style: 'solid', width: '2px' });
});
