import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { THEME_NAMES } from '../../src/tokens/themes.ts';

// The a11y harness: every playground state, in every
// theme, default and dense, at desktop, 320px and 200% zoom.
const THEMES = THEME_NAMES;
const DENSITIES = ['default', 'dense'] as const;
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, scale: 1 },
  { name: '320px', width: 320, height: 640, scale: 1 },
  // 200% zoom: a 1280 window at zoom 2 lays out at 640 CSS px.
  { name: '200% zoom', width: 640, height: 400, scale: 2 },
] as const;

const INTERACTIVE = 'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
// Elements a Tab press stops on: one per radio group, none for disabled controls.
const TABBABLE_COUNT = () =>
  // Rendered only: breakpoint-hidden items (display:none) are not in the tab order.
  Array.from(document.querySelectorAll('a[href], button, input:not([type="radio"]):not([disabled]), select:not([disabled]):not([aria-hidden="true"]), textarea:not([disabled])')).filter((el) => el.getClientRects().length > 0).length +
  new Set(Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]:not([disabled])')).filter((r) => r.getClientRects().length > 0).map((r) => r.name)).size;

async function open(page: Page, theme: string, density: string) {
  await page.goto(`/?theme=${theme}${density === 'dense' ? '&density=dense' : ''}`);
  await page.locator('h1').waitFor();
}

for (const theme of THEMES) {
  for (const density of DENSITIES) {
    for (const vp of VIEWPORTS) {
      test.describe(`${theme} · ${density} · ${vp.name}`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale });

        test('zero axe violations', async ({ page }) => {
          await open(page, theme, density);
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
            .analyze();
          expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        });

        test('no horizontal overflow', async ({ page }) => {
          await open(page, theme, density);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow).toBeLessThanOrEqual(0);
        });

        test('every target is at least 44×44', async ({ page }) => {
          await open(page, theme, density);
          const small = await page.$$eval(INTERACTIVE, (els) =>
            els
              .filter((el) => !el.closest('.sr-only') || el.closest('label'))
              // Radix's form-carrier <select> (a Select inside a <form>) is aria-hidden: not a target.
              .filter((el) => !el.matches('select[aria-hidden="true"]'))
              // Not rendered (the sidebar below lg): nothing to hit.
              .filter((el) => el.getClientRects().length > 0)
              .map((el) => {
                // A native checkbox, radio or hidden segment input is targeted
                // through its label row, which is the clickable area.
                const target = el.closest('label') ?? el;
                const r = target.getBoundingClientRect();
                return { name: el.textContent?.trim() || el.getAttribute('aria-label'), w: r.width, h: r.height };
              })
              .filter((t) => t.w < 44 || t.h < 44),
          );
          expect(small).toEqual([]);
        });
      });
    }
  }
}

test('every focusable element shows the 2px outline, in forced colors too', async ({ page }) => {
  for (const forcedColors of ['none', 'active'] as const) {
    await page.emulateMedia({ forcedColors });
    await open(page, 'day', 'default');
    const count = await page.evaluate(TABBABLE_COUNT);
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab');
      const ring = await page.evaluate(() => {
        let el = document.activeElement as HTMLElement;
        // A visually hidden input (segmented control) draws its ring on its label.
        if (el.classList.contains('sr-only') && el.closest('label')) el = el.closest('label') as HTMLElement;
        const s = getComputedStyle(el);
        return { tag: el.tagName, text: el.textContent?.trim(), style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(ring.style, `${forcedColors}: ${ring.tag} ${ring.text}`).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
    }
  }
});

test('skip link is first and moves focus to main', async ({ page }) => {
  await open(page, 'day', 'default');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('document title names the route', async ({ page }) => {
  await open(page, 'day', 'default');
  await expect(page).toHaveTitle('Playground · cuix');
});

test('disabled button stays focusable, swallows clicks and announces its reason', async ({ page }) => {
  await open(page, 'day', 'default');
  const locked = page.getByTestId('disabled-counter');
  await locked.click({ force: true });
  await expect(locked).not.toHaveAttribute('data-clicks');
  await expect(locked).toHaveAttribute('aria-disabled', 'true');
  await expect(locked).toHaveAccessibleDescription('Locked');
  await locked.focus();
  await expect(locked).toBeFocused();
  await page.getByTestId('counter').click();
  await expect(page.getByTestId('counter')).toHaveAttribute('data-clicks', '1');
});

test('loading keeps the label as the name and the width unchanged', async ({ page }) => {
  await open(page, 'day', 'default');
  const idle = await page.getByTestId('width-idle').boundingBox();
  const busy = page.getByTestId('width-busy');
  await expect(busy).toHaveAccessibleName('Publish');
  await expect(busy).toHaveAttribute('aria-busy', 'true');
  expect((await busy.boundingBox())?.width).toBe(idle?.width);
  const idleTrailing = await page.getByTestId('width-idle-trailing').boundingBox();
  expect((await page.getByTestId('width-busy-trailing').boundingBox())?.width).toBe(idleTrailing?.width);
});

test('reduced motion stops the spinner and collapses durations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 'day', 'default');
  const spinner = page.locator('[aria-busy="true"] svg').first();
  await expect(spinner).toHaveCSS('animation-name', 'none');
  const fast = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cuix-motion-fast').trim());
  expect(fast).toBe('0.01ms');
});

test('theme switcher persists the choice and updates theme-color', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a1d2a');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.getByRole('button', { name: 'Night', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // An extended theme goes through the same path, with its own scheme.
  await page.getByRole('button', { name: 'Ocean', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f131a');
  await page.getByRole('button', { name: 'Dawn', exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
  await page.getByRole('button', { name: 'System' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('Field wires id, description, invalid state and required', async ({ page }) => {
  await open(page, 'day', 'default');
  const email = page.getByLabel('Email');
  await expect(email).toHaveAttribute('required', '');
  await expect(email).toHaveAccessibleDescription('We only use it for sign-in links.');
  const company = page.getByTestId('invalid-input');
  await expect(company).toHaveAttribute('aria-invalid', 'true');
  await expect(company).toHaveAccessibleDescription('Enter the company name.');
  await expect(page.getByRole('alert').filter({ hasText: 'Enter the company name.' })).toBeVisible();
});

test('Field label stays associated when the control has its own id', async ({ page }) => {
  await open(page, 'day', 'default');
  const phone = page.getByLabel('Phone');
  await expect(phone).toHaveAttribute('id', 'phone-own-id');
  await expect(page.locator('label', { hasText: 'Phone' })).toHaveAttribute('for', 'phone-own-id');
  await page.locator('label', { hasText: 'Phone' }).click();
  await expect(phone).toBeFocused();
  const own = await new AxeBuilder({ page }).include('#phone-own-id').withRules(['label']).analyze();
  expect(own.violations).toEqual([]);
});

test('native select takes its colour-scheme from the page theme, not the OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const scheme = () => page.locator('select').first().evaluate((el) => getComputedStyle(el).colorScheme);
  await open(page, 'day', 'default');
  expect(await scheme()).toBe('light');
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  expect(await scheme()).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await scheme()).toBe('light');
});

test('switch toggles by click and keyboard; disabled switch does not', async ({ page }) => {
  await open(page, 'day', 'default');
  const sw = page.getByRole('switch', { name: 'Email notifications' });
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.press('Space');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  const locked = page.getByRole('switch', { name: 'Locked setting' });
  await locked.click({ force: true });
  await expect(locked).toHaveAttribute('aria-checked', 'false');
});

test('segmented control and radio group move with arrow keys', async ({ page }) => {
  await open(page, 'day', 'default');
  const list = page.getByRole('radio', { name: 'List' });
  await list.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Grid' })).toBeChecked();
  const team = page.getByRole('radio', { name: 'Team' });
  await team.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('radio', { name: 'Solo' })).toBeChecked();
});

test('selected segment stays visible in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, 'day', 'default');
  const selected = page.locator('label:has(> input[value="list"])');
  const other = page.locator('label:has(> input[value="board"])');
  const bg = (l: typeof selected) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(selected)).not.toBe(await bg(other));
  const highlight = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'Highlight';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(await bg(selected)).toBe(highlight);
});

test('checkbox and radio draw their edges and marks with tokens, in forced colors too', async ({ page }) => {
  const edge = (l: Locator) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.borderTopWidth, style: s.borderTopStyle, color: s.borderTopColor, bg: s.backgroundColor };
    });
  const mark = (l: Locator) => l.locator('xpath=following-sibling::span[1]');
  const token = (name: string) =>
    page.evaluate((n) => {
      const probe = document.createElement('i');
      probe.style.color = `var(--cuix-${n})`;
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, name);

  await open(page, 'day', 'default');
  const checked = page.getByRole('checkbox', { name: 'Send me product updates' });
  const invalid = page.getByRole('checkbox', { name: 'Accept the terms' });
  const disabled = page.getByRole('checkbox', { name: 'Disabled option' });
  const team = page.getByRole('radio', { name: 'Team' });
  const solo = page.getByRole('radio', { name: 'Solo' });
  expect((await edge(solo)).color).toBe(await token('border-strong'));
  expect((await edge(invalid)).color).toBe(await token('danger'));
  expect((await edge(disabled)).bg).toBe(await token('surface-raised'));
  await expect(mark(checked)).toBeVisible();
  await expect(mark(team)).toBeVisible();
  await expect(mark(invalid)).toBeHidden();
  await expect(mark(solo)).toBeHidden();
  await invalid.check();
  await expect(mark(invalid)).toBeVisible();

  // Not in the playground: an invalid group and an indeterminate box.
  await solo.evaluate((el) => el.closest('fieldset')!.setAttribute('aria-invalid', 'true'));
  expect((await edge(solo)).color).toBe(await token('danger'));
  const dash = (l: Locator) => l.locator('xpath=following-sibling::span[2]');
  await expect(dash(disabled)).toBeHidden();
  await disabled.evaluate((el) => ((el as HTMLInputElement).indeterminate = true));
  await expect(dash(disabled)).toBeVisible();

  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, 'day', 'default');
  for (const l of [checked, invalid, disabled, team, solo]) {
    const e = await edge(l);
    expect(e.style).toBe('solid');
    expect(e.width).toBe('2px');
    expect(e.color).not.toBe(e.bg);
  }
  await expect(mark(checked).locator('svg')).toBeVisible();
  await expect(mark(invalid)).toBeHidden();
  const dot = mark(team).locator('span');
  const ground = await mark(team).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await dot.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(ground);
});
