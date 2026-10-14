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
