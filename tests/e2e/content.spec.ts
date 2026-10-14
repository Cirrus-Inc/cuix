import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Phase 2d: content and feedback.
async function open(page: Page, theme = 'day') {
  await page.goto(`/?theme=${theme}`);
  await page.locator('h1').waitFor();
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('Card title is an h3 by default and follows headingLevel', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Plan summary' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Invoice #1042' })).toBeVisible();
});

test('badges carry a word, empty states have a role, card padding follows density', async ({ page }) => {
  await open(page);
  const badges = page.locator('#badge-h ~ div > span');
  expect(await badges.count()).toBe(12);
  for (const b of await badges.all()) expect((await b.innerText()).trim().length).toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: 'No entries this week' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load entries' })).toBeVisible();
  const pad = (el: Element) => getComputedStyle(el).paddingLeft;
  // The padding sits on the card's body, so pad="none" can drop it without touching the frame.
  const body = () => page.locator('#card-h ~ div > div').nth(1).locator('> div').first();
  expect(await body().evaluate(pad)).toBe('16px');
  await page.goto('/?theme=day&density=dense');
  await page.locator('h1').waitFor();
  expect(await body().evaluate(pad)).toBe('12px');
});

test('confirm inline: focus lands on Keep, Escape backs out, Enter on Delete deletes', async ({ page }) => {
  await open(page);
  await page.getByTestId('delete').click();
  const group = page.getByRole('group', { name: 'Delete this entry?' });
  await expect(group.getByRole('button', { name: 'Keep' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(group).toBeHidden();
  await expect(page.getByTestId('delete')).toBeFocused();
  await page.getByTestId('delete').click();
  await group.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('deleted')).toBeVisible();
});

for (const theme of ['day', 'night'] as const) {
  test(`toasts: roles, stickiness, merge, cap, dismiss all, log (${theme})`, async ({ page }) => {
    await open(page, theme);
    await page.getByTestId('toast-error').click();
    const error = page.getByRole('alert').filter({ hasText: 'Could not save the entry.' });
    await expect(error).toBeVisible();
    await page.getByTestId('toast-error').click();
    await expect(error).toContainText('×2');
    await expect(page.getByRole('alert').filter({ hasText: 'Could not save' })).toHaveCount(1);

    await page.getByTestId('toast-success').click();
    const ok = page.getByRole('status').filter({ hasText: 'Entry saved.' });
    await expect(ok).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dismiss all' })).toBeVisible();
    await axe(page);
    await expect(ok).toBeHidden({ timeout: 6000 });
    await expect(error).toBeVisible();

    await page.getByTestId('toast-warning').click();
    await page.getByTestId('toast-undo').click();
    await page.getByTestId('toast-undo').click();
    await page.getByTestId('toast-undo').click();
    // 1 error + 1 warning + 3 undo toasts = 5 → the oldest (the error) is pushed out.
    await expect(page.getByRole('region', { name: 'Notifications' }).locator('[role="alert"], [role="status"]')).toHaveCount(4);
    await expect(error).toBeHidden();
    await page.getByRole('button', { name: 'Undo' }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Entry restored.' })).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss all' }).click();
    await expect(page.getByRole('region', { name: 'Notifications' }).locator('[role="alert"], [role="status"]')).toHaveCount(0);

    const log = page.getByTestId('toast-log').getByRole('listitem');
    await expect(log.first()).toContainText('Entry restored.');
    expect(await log.count()).toBe(8);
  });
}

test('toasts: a pointer in the region holds the timer, leaving re-arms it', async ({ page }) => {
  await open(page);
  await page.getByTestId('toast-success').click();
  const ok = page.getByRole('status').filter({ hasText: 'Entry saved.' });
  await ok.hover();
  await page.waitForTimeout(5000);
  await expect(ok).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(ok).toBeHidden({ timeout: 6000 });
});
