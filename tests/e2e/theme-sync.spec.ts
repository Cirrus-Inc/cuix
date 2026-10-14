import { expect, test } from '@playwright/test';

test('theme change in one tab reaches a second tab without reload', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  for (const p of [a, b]) {
    await p.goto('/');
    await p.locator('h1').waitFor();
  }
  await b.evaluate(() => localStorage.setItem('lumux-theme', 'night'));
  await expect(a.locator('html')).toHaveAttribute('data-theme', 'night');
  await b.evaluate(() => localStorage.removeItem('lumux-theme'));
  await expect(a.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});
