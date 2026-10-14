import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 2c: every overlay open, in day, night and the hive pair, desktop and 320px.
const INTERACTIVE = 'a[href], button, input, select, textarea, [role="menuitem"]';

async function open(page: Page, theme = 'day') {
  await page.goto(`/?theme=${theme}`);
  await page.locator('h1').waitFor();
}

// WebKit does not focus a clicked button, so there the opener is activated by
// keyboard; Chromium keeps the mouse path, which is what most users take.
async function activate(page: Page, el: Locator, browserName: string) {
  if (browserName !== 'webkit') return el.click();
  await el.focus();
  await expect(el).toBeFocused();
  await page.keyboard.press('Enter');
}

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function targets(page: Page, within: string) {
  const small = await page.locator(within).locator(INTERACTIVE).evaluateAll((els) =>
    els
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.textContent?.trim() || el.getAttribute('aria-label'), w: r.width, h: r.height };
      })
      .filter((t) => t.w < 44 || t.h < 44),
  );
  expect(small).toEqual([]);
}

for (const theme of ['day', 'night', 'hive-day', 'hive-night'] as const) {
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: '320px', width: 320, height: 640 },
  ]) {
    test.describe(`${theme} · ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('dialog: named, trapped, 44px, axe clean, closes on Escape, returns focus', async ({ page, browserName }) => {
        await open(page, theme);
        const opener = page.getByTestId('open-dialog');
        await activate(page, opener, browserName);
        const dialog = page.getByRole('dialog', { name: 'Edit profile' });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAccessibleDescription('Changes apply to every workspace.');
        // Focus is inside and stays inside through three Tabs.
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Tab');
          expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
        }
        await targets(page, '[role="dialog"]');
        await axe(page);
        if (vp.width < 640) {
          // Below sm every size is a full-screen sheet.
          const box = await dialog.boundingBox();
          expect(box?.width).toBe(vp.width);
          expect(box?.height).toBe(vp.height);
        }
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
      });

      test('sheet, drawer, menu and popover are 44px and axe clean', async ({ page }) => {
        await open(page, theme);
        await page.getByTestId('open-sheet-a').click();
        await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
        await targets(page, '[role="dialog"]');
        await axe(page);
        await page.keyboard.press('Escape');

        await page.getByTestId('open-drawer').click();
        const drawer = page.getByRole('dialog', { name: 'Menu' });
        await expect(drawer).toBeVisible();
        await expect(drawer.getByRole('navigation', { name: 'Menu' })).toBeVisible();
        await targets(page, '[role="dialog"]');
        await axe(page);
        await page.keyboard.press('Escape');

        await page.getByTestId('open-menu').click();
        await expect(page.getByRole('menu', { name: 'Actions' })).toBeVisible();
        await targets(page, '[role="menu"]');
        await axe(page);
        await page.keyboard.press('Escape');

        await page.getByTestId('open-popover').click();
        await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
        await targets(page, '[role="dialog"]');
        await axe(page);
        await page.keyboard.press('Escape');
      });
    });
  }
}

test('dialog: opened by click, Escape returns focus to the opener (Safari does not focus clicked buttons)', async ({ page }) => {
  await open(page);
  const opener = page.getByTestId('open-dialog');
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Edit profile' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('dialog: overlay click closes unless dismissOnOverlay is false', async ({ page }) => {
  await open(page);
  await page.getByTestId('open-dialog').click();
  await page.mouse.click(10, 10);
  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeHidden();

  await page.getByTestId('open-guarded').click();
  const guarded = page.getByRole('dialog', { name: 'New note' });
  await page.mouse.click(10, 10);
  await expect(guarded).toBeVisible();
  await guarded.getByRole('button', { name: 'Close' }).click();
  await expect(guarded).toBeHidden();
});

test('dialog: one level of nesting stacks and Escape closes only the top', async ({ page, browserName }) => {
  await open(page);
  await page.getByTestId('open-dialog').click();
  // Radix moves focus into the dialog on mount; activating Save before that
  // lands lets the mount focus win and Enter hit another control.
  const first = page.getByRole('dialog', { name: 'Edit profile' });
  await expect.poll(() => first.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await activate(page, page.getByRole('button', { name: 'Save' }), browserName);
  const top = page.getByRole('dialog', { name: 'Confirm save' });
  await expect(top).toBeVisible();
  // The scrim carries the layer: z-modal-top for the second level.
  expect(await top.evaluate((el) => getComputedStyle(el.parentElement!).zIndex)).toBe('60');
  await page.keyboard.press('Escape');
  await expect(top).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
});

test('dialog: a third level never throws and logs in development', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await open(page);
  await page.getByTestId('open-dialog').click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByTestId('open-third').click();
  await expect(page.getByRole('dialog', { name: 'Third level' })).toBeVisible();
  await expect(page.locator('h1')).toBeAttached();
  expect(errors.some((e) => e.includes('§5.4'))).toBe(true);
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([]);
});

// Its own describe with test.use, not a second context: a second page in the
// same browser steals window focus from the other tests' pages (tooltip blur).
test.describe('coarse pointer', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
  test('dialog footer stacks primary on top', async ({ page }) => {
    await open(page);
    await page.getByTestId('open-dialog').tap();
    const save = await page.getByRole('button', { name: 'Save' }).boundingBox();
    const cancel = await page.getByRole('button', { name: 'Cancel' }).boundingBox();
    expect(save!.y).toBeLessThan(cancel!.y);
  });
});

test('sheet: only one open at a time', async ({ page }) => {
  await open(page);
  await page.getByTestId('open-sheet-a').click();
  await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('open-sheet-a').click();
  // The first sheet is modal, so a real click can't reach the page; this is
  // the programmatic open an app does from a row or a shortcut.
  await page.getByTestId('open-sheet-b').dispatchEvent('click');
  await expect(page.getByRole('dialog', { name: 'Activity' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Contact' })).toBeHidden();
});

test('sheet: modal={false} from lg up keeps the page usable without closing', async ({ page }) => {
  await open(page);
  await page.getByTestId('open-sheet-b').click();
  const sheet = page.getByRole('dialog', { name: 'Activity' });
  await expect(sheet).toBeVisible();
  await page.locator('h1').click();
  await page.getByTestId('open-sheet-a').focus();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
});

test('tooltip opens on focus, on hover and on long press, and describes the trigger', async ({ page }) => {
  await open(page);
  const trigger = page.getByTestId('tooltip-trigger');
  // In view and settled first: Radix closes a tooltip on scroll, and focusing
  // an off-screen trigger scrolls, with the event landing after the open.
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('tooltip').first()).toHaveText('Copy the link');
  await expect
    .poll(() => trigger.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent))
    .toContain('Copy the link');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.mouse.move(0, 0);
  await trigger.hover();
  await expect(page.getByRole('tooltip').first()).toBeVisible();
  // A real pointer leaves in steps; a single jump never crosses the grace area.
  await page.mouse.move(0, 0, { steps: 10 });
  await expect(page.getByRole('tooltip')).toBeHidden();
  await trigger.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true });
  await expect(page.getByRole('tooltip').first()).toBeVisible();
  await trigger.dispatchEvent('pointerup', { pointerType: 'touch', bubbles: true });
  await expect(page.getByRole('tooltip')).toBeHidden();
});

test('menu: keyboard operation, disabled reason, focus back to trigger', async ({ page }) => {
  await open(page);
  const trigger = page.getByTestId('open-menu');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Actions' });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: /Duplicate/ })).toBeFocused();
  await expect(page.getByRole('menuitem', { name: /Duplicate/ })).toHaveAccessibleDescription('Plan limit reached');
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(page.getByTestId('last-menu')).toHaveText('nothing selected');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(page.getByTestId('last-menu')).toHaveText('delete');
  await expect(trigger).toBeFocused();
});

test('popover: focus moves in and returns, Escape closes', async ({ page }) => {
  await open(page);
  const trigger = page.getByTestId('open-popover');
  await trigger.click();
  const pop = page.getByRole('dialog', { name: 'Filters' });
  await expect(pop).toBeVisible();
  expect(await pop.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(trigger).toBeFocused();
});
