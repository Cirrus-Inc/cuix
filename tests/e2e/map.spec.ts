import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// UsMap at the state level (playground/map.html): zoom controls and the county outline.
async function open(page: Page, query = 'theme=day') {
  await page.goto(`/map.html?${query}`);
  await page.locator('h1').waitFor();
  // The county file loads on demand; the first county button means it arrived.
  await page.getByRole('button', { name: 'Duval: 4 schools' }).waitFor({ state: 'attached' });
}

const zoomIn = (page: Page) => page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Zoom in' });
const zoomOut = (page: Page) => page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Zoom out' });
const fit = (page: Page) => page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: 'Fit' });
const tabbable = (page: Page) => page.locator('svg [role="button"][tabindex="0"]').count();

for (const theme of ['day', 'night', 'hive-day', 'hive-night'] as const) {
  test(`zoom controls: zero axe violations, 44px targets (${theme})`, async ({ page }) => {
    await open(page, `theme=${theme}`);
    for (const b of [zoomIn(page), zoomOut(page), fit(page)]) {
      const box = await b.boundingBox();
      expect(box && box.width >= 44 && box.height >= 44).toBe(true);
    }
    await zoomIn(page).click();
    const { violations } = await new AxeBuilder({ page })
      .include('.cuix-map-zoom')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('zoom controls: keyboard reachable, focus outline, disabled at the clamps without losing focus', async ({ page }) => {
  await open(page);
  await expect(zoomOut(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(fit(page)).toHaveAttribute('aria-disabled', 'true');
  await zoomIn(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(zoomIn(page)).toBeFocused();
  const outline = await zoomIn(page).evaluate((el) => getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth);
  expect(outline).toBe('solid 2px');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1.5');
  await expect(zoomOut(page)).not.toHaveAttribute('aria-disabled');
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 8');
  await expect(zoomIn(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(zoomIn(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 8');

  await page.keyboard.press('Tab');
  await expect(zoomOut(page)).toBeFocused();
  await page.keyboard.press(' ');
  await expect(page.getByTestId('zoom')).toHaveText(/^Zoom 5\.33/);
  await page.keyboard.press('Tab');
  await expect(fit(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1');
  await expect(fit(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(fit(page)).toBeFocused();
});

test('zoomed in, off-screen counties and points leave the tab order and come back at Fit', async ({ page }) => {
  await open(page);
  const all = await tabbable(page);
  expect(all).toBeGreaterThan(0);
  for (let i = 0; i < 6; i++) await zoomIn(page).click();
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 8');
  await expect.poll(() => tabbable(page)).toBeLessThan(all);
  // Pensacola sits at the far west of the panhandle, well outside the centre at 8x.
  await expect(page.getByRole('button', { name: 'Pensacola interpreter' })).toHaveAttribute('tabindex', '-1');
  await fit(page).click();
  await expect.poll(() => tabbable(page)).toBe(all);
});

test('the app can drive the zoom from its own toolbar, with the built-in controls off', async ({ page }) => {
  await open(page, 'theme=day&controlled=1');
  await expect(page.getByRole('group', { name: 'Zoom' })).toHaveCount(0);
  const camera = page.locator('.cuix-map-camera');
  const scale = () => camera.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  const before = await scale();
  await page.getByRole('button', { name: 'Toolbar zoom 4×' }).click();
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 4');
  await expect.poll(scale).toBeCloseTo(before * 4, 3);
});

test('countyOutline bold draws the county borders at 2px in border-strong', async ({ page }) => {
  await open(page);
  const county = page.locator('svg path.cuix-map-none').last();
  const stroke = () => county.evaluate((el) => ({ w: getComputedStyle(el).strokeWidth, c: getComputedStyle(el).stroke }));
  const thin = await stroke();
  expect(thin.w).toBe('1px');
  await page.getByTestId('bold').check();
  const bold = await stroke();
  expect(bold.w).toBe('2px');
  const strong = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--cuix-border-strong)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(bold.c).toBe(strong);
  // The highlight path and the state outline are untouched by the grid.
  await expect(page.locator('svg path.cuix-map-outline')).toHaveCSS('stroke-width', '2px');
});
