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

test('a shaded county keeps its outline in every theme and in forced colors; detail describes it', async ({ page }) => {
  for (const theme of ['day', 'night', 'hive-day', 'hive-night'] as const) {
    for (const forcedColors of ['none', 'active'] as const) {
      await page.emulateMedia({ forcedColors });
      await open(page, `theme=${theme}`);
      const path = page.getByRole('button', { name: 'Alachua: 40 students', exact: true }).locator('path.cuix-map-shade');
      const { stroke, width } = await path.evaluate((el) => {
        const s = getComputedStyle(el);
        return { stroke: s.stroke, width: parseFloat(s.strokeWidth) };
      });
      expect(stroke, `${theme} ${forcedColors}`).not.toBe('none');
      expect(width, `${theme} ${forcedColors}`).toBeGreaterThanOrEqual(1);
    }
  }
  // Playwright's own description maths skips SVG <title>; Chromium's tree (SVG-AAM) is what AT reads.
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: { name?: { value: string }; description?: { value: string } }[] };
  const alachua = nodes.find((n) => n.name?.value === 'Alachua: 40 students');
  expect(alachua?.description?.value).toBe('Alachua: 40 Deaf and hard of hearing students');
});

test('selected draws the focus ring on that county only; unknown FIPS draws nothing; highlight is separate', async ({ page }) => {
  await open(page, 'theme=day&highlight=12095');
  const band = page.locator('svg path.cuix-map-ring-band');
  const line = page.locator('svg path.cuix-map-ring-line');
  await expect(band).toHaveCount(0);
  await page.getByTestId('selected').selectOption('12031');
  await expect(band).toHaveCount(1);
  await expect(line).toHaveCount(1);
  await expect(line).toHaveCSS('stroke-width', '2px');
  await expect(band).toHaveCSS('stroke-width', '6px');
  await expect(line).toHaveCSS('pointer-events', 'none');
  const duval = await page.getByRole('button', { name: 'Duval: 4 schools' }).locator('path').first().getAttribute('d');
  expect(await line.getAttribute('d')).toBe(duval);
  await expect(page.locator('svg path.cuix-map-highlight')).toHaveCount(1);
  await zoomIn(page).click();
  await expect(line).toHaveCSS('stroke-width', '2px');
  await page.getByTestId('selected').selectOption('99999');
  await expect(band).toHaveCount(0);
  await page.getByTestId('selected').selectOption('');
  await expect(band).toHaveCount(0);
});

// Gestures: wheel, drag, double-click, keys, selected bounds.
const svg = (page: Page) => page.locator('.cuix-map > svg');
const cam = (page: Page) => page.locator('.cuix-map-camera').evaluate((el) => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return { k: m.a, x: m.e, y: m.f };
});
const settled = async (page: Page) => {
  // Skip the 400ms ease: two equal reads in a row.
  let last = '';
  await expect
    .poll(async () => {
      const c = JSON.stringify(await cam(page));
      const same = c === last;
      last = c;
      return same;
    })
    .toBe(true);
};
const centre = async (page: Page) => {
  const b = (await svg(page).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('wheel zooms about the pointer, not the centre, and reports through onZoomChange', async ({ page }) => {
  await open(page);
  const b = (await svg(page).boundingBox())!;
  const px = b.x + b.width * 0.3;
  const py = b.y + b.height * 0.3;
  const before = await cam(page);
  // The map point under the pointer, in view units.
  const mapPt = { x: ((px - b.x) / b.width) * 975, y: ((py - b.y) / b.height) * 610 };
  await page.mouse.move(px, py);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await cam(page)).k).toBeGreaterThan(before.k * 1.15);
  await settled(page);
  const after = await cam(page);
  const f = after.k / before.k;
  expect(after.x).toBeCloseTo(mapPt.x - (mapPt.x - before.x) * f, 0);
  expect(after.y).toBeCloseTo(mapPt.y - (mapPt.y - before.y) * f, 0);
  await expect(page.getByTestId('zoom')).not.toHaveText('Zoom 1');
  await fit(page).click();
  await settled(page);
  expect(await cam(page)).toEqual(before);
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1');
});

test('with wheelZoom=modifier a plain wheel does not zoom (the page keeps it) and ctrl+wheel does', async ({ page }) => {
  await open(page, 'theme=day&modifier=1');
  const before = await cam(page);
  const c = await centre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(200);
  expect(await cam(page)).toEqual(before);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await cam(page)).k).toBeGreaterThan(before.k);
});

test('drag pans with grab cursors, never selects, and a small press is still a click; Fit resets', async ({ page }) => {
  await open(page);
  await zoomIn(page).click();
  await zoomIn(page).click();
  await settled(page);
  const county = page.getByRole('button', { name: 'Hillsborough: 3 schools' });
  const start = (await svg(page).boundingBox())!;
  await expect(svg(page)).toHaveCSS('cursor', 'grab');
  const before = await cam(page);
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y + 1);
  await page.mouse.move(x + 60, y + 20, { steps: 5 });
  await expect(page.locator('.cuix-map')).toHaveClass(/cuix-map-dragging/);
  await expect(svg(page)).toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  await expect(page.locator('.cuix-map')).not.toHaveClass(/cuix-map-dragging/);
  await page.waitForTimeout(50);
  const after = await cam(page);
  expect(after.x - before.x).toBeGreaterThan(30);
  expect(after.k).toBe(before.k);
  await expect(page.getByTestId('selects')).toHaveText('Selects 0');
  // Release over a county: still no select. Now a press with 2px of jitter selects.
  const box = (await county.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.getByTestId('selects')).toHaveText('Selects 1');
  await fit(page).click();
  await settled(page);
  await expect.poll(async () => (await cam(page)).k).toBeLessThan(before.k);
  const reset = await cam(page);
  await zoomIn(page).click();
  await fit(page).click();
  await settled(page);
  expect(await cam(page)).toEqual(reset);
});

test('the pan cannot take the state out of the view', async ({ page }) => {
  await open(page);
  for (let i = 0; i < 4; i++) await zoomIn(page).click();
  await settled(page);
  const b = (await svg(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 2000, b.y + b.height / 2 + 2000, { steps: 8 });
  await page.mouse.up();
  await settled(page);
  const outline = (await page.locator('svg path.cuix-map-outline').boundingBox())!;
  expect(outline.x + outline.width).toBeGreaterThan(b.x);
  expect(outline.x).toBeLessThan(b.x + b.width);
  expect(outline.y + outline.height).toBeGreaterThan(b.y);
  expect(outline.y).toBeLessThan(b.y + b.height);
});

test('double-click zooms in one step and selects once', async ({ page }) => {
  await open(page);
  // Hillsborough has no marker or tooltip over it.
  const county = page.getByRole('button', { name: 'Hillsborough: 3 schools' });
  const box = (await county.boundingBox())!;
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1.5');
  await expect(page.getByTestId('selects')).toHaveText('Selects 1');
});

test('pin mode: a click on a county reports map coordinates and selects nothing; a double-click only zooms', async ({ page }) => {
  await open(page);
  await page.getByTestId('drop-pin').check();
  await expect(svg(page)).toHaveClass(/cuix-map-pin/);
  const county = page.getByRole('button', { name: 'Hillsborough: 3 schools' });
  const box = (await county.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('pin')).toHaveText(/^\d+(\.\d+)?,\d+(\.\d+)?$/);
  const [x, y] = (await page.getByTestId('pin').innerText()).split(',').map(Number) as [number, number];
  expect(x).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThanOrEqual(975);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(y).toBeLessThanOrEqual(610);
  await expect(page.getByTestId('selects')).toHaveText('Selects 0');
  await expect(page.locator('.cuix-map-camera polygon[fill-opacity]')).toHaveCount(1);
  // The reported point is in map space: the marker drawn at it lands under the click, not elsewhere in the fitted state.
  const mark = (await page.getByRole('button', { name: 'Dropped pin' }).boundingBox())!;
  expect(Math.abs(mark.x + mark.width / 2 - (box.x + box.width / 2))).toBeLessThan(4);
  expect(Math.abs(mark.y + mark.height / 2 - (box.y + box.height / 2))).toBeLessThan(4);
  const before = await page.getByTestId('pin').innerText();
  await page.mouse.dblclick(box.x + box.width / 4, box.y + box.height / 4);
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1.5');
  await page.waitForTimeout(400);
  expect(await page.getByTestId('pin').innerText()).toBe(before);
  await expect(page.getByTestId('selects')).toHaveText('Selects 0');
  await page.getByRole('button', { name: 'Duval: 4 schools' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pin')).not.toHaveText(before);
  await expect(page.getByTestId('selects')).toHaveText('Selects 0');
});

test('keyboard on the focused map: + and - zoom, arrows pan; a focused county keeps its keys', async ({ page }) => {
  await open(page);
  await svg(page).focus();
  await page.keyboard.press('ArrowLeft');
  const fitCam = await cam(page);
  await page.keyboard.press('+');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1.5');
  await page.keyboard.press('=');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 2.25');
  await settled(page);
  const z = await cam(page);
  await page.keyboard.press('ArrowRight');
  await settled(page);
  expect((await cam(page)).x).toBeLessThan(z.x);
  await page.keyboard.press('ArrowDown');
  await settled(page);
  expect((await cam(page)).y).toBeLessThan(z.y);
  await page.keyboard.press('-');
  await page.keyboard.press('-');
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 1');
  await settled(page);
  expect(await cam(page)).toEqual(fitCam);
  // On a county the arrows do nothing to the camera.
  await page.keyboard.press('+');
  await settled(page);
  const zoomed = await cam(page);
  await page.getByRole('button', { name: 'Duval: 4 schools' }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(100);
  expect(await cam(page)).toEqual(zoomed);
});

test('onSelectedBounds reports the county on screen, after camera changes', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('bounds')).toHaveText('none');
  await page.getByTestId('selected').selectOption('12031');
  const read = async () => {
    const t = await page.getByTestId('bounds').innerText();
    const [x, y, w, h] = t.split(',').map(Number) as [number, number, number, number];
    return { x, y, w, h };
  };
  await expect.poll(async () => (await read()).w).toBeGreaterThan(0);
  const ring = async () => (await page.locator('svg path.cuix-map-ring-line').boundingBox())!;
  const near = async () => {
    const r = await ring();
    const b = await read();
    // The stroke is 2px around the geometry: within a few px.
    expect(Math.abs(b.x - r.x)).toBeLessThan(4);
    expect(Math.abs(b.y - r.y)).toBeLessThan(4);
    expect(Math.abs(b.w - r.width)).toBeLessThan(6);
  };
  await settled(page);
  await near();
  await zoomIn(page).click();
  await zoomIn(page).click();
  await settled(page);
  await expect.poll(async () => (await read()).w).toBeGreaterThan(0);
  await expect.poll(async () => Math.abs((await read()).w - (await ring()).width)).toBeLessThan(6);
  await near();
  await page.getByTestId('selected').selectOption('');
  await expect(page.getByTestId('bounds')).toHaveText('none');
});

test('a controlled zoom with the built-in controls off gets the wheel and double-click too', async ({ page }) => {
  await open(page, 'theme=day&controlled=1');
  const c = await centre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, -100);
  await expect(page.getByTestId('zoom')).not.toHaveText('Zoom 1');
  await page.getByRole('button', { name: 'Toolbar zoom 4×' }).click();
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 4');
  const d = await centre(page);
  await page.mouse.dblclick(d.x, d.y);
  await expect(page.getByTestId('zoom')).toHaveText('Zoom 6');
});
