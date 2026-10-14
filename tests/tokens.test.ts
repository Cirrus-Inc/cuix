import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { COLOR_TOKENS } from '../src/tokens/vocabulary.ts';
import { THEMES } from '../src/tokens/sets/index.ts';
import { SYSTEM_THEME, THEME_NAMES } from '../src/tokens/themes.ts';

const dist = (f: string) => readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');

// Every declaration of a theme, in order, as tokens.css and tokens.host.css print it.
const themeBlock = (theme: (typeof THEME_NAMES)[number]) =>
  [`color-scheme: ${THEMES[theme].scheme};`, ...COLOR_TOKENS.map((t) => `--lumux-${t}: ${THEMES[theme].colors[t]};`)];

test('every theme fills every colour token with a hex value', () => {
  assert.equal(THEME_NAMES.length, 6);
  for (const theme of THEME_NAMES) {
    assert.deepEqual(Object.keys(THEMES[theme].colors).sort(), [...COLOR_TOKENS].sort());
    for (const [k, v] of Object.entries(THEMES[theme].colors)) {
      assert.match(v, /^#[0-9a-f]{6}([0-9a-f]{2})?$/, `${theme} ${k}`);
    }
  }
});

test('tokens.css declares every colour token in every theme', () => {
  const css = dist('tokens.css');
  for (const theme of THEME_NAMES) {
    const selector = theme === SYSTEM_THEME.light ? `:root, [data-theme="${theme}"] {` : `[data-theme="${theme}"] {`;
    const start = css.indexOf(selector);
    assert.ok(start >= 0, selector);
    const body = css.slice(start, css.indexOf('}', start));
    for (const decl of themeBlock(theme)) assert.ok(body.includes(decl), `${theme} ${decl}`);
  }
  const os = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  assert.ok(os.includes(`--lumux-background: ${THEMES[SYSTEM_THEME.dark].colors.background};`), 'system dark is the night theme');
  assert.ok(css.includes('--lumux-radius-control: 0.25rem;'), 'square controls');
  assert.ok(css.includes('--lumux-radius-card: 0.5rem;'));
  const dense = css.slice(css.indexOf('[data-density="dense"] {'));
  assert.doesNotMatch(dense.slice(0, dense.indexOf('}')), /radius/, 'dense never changes radius');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\[data-reduce-motion="true"\]/);
  assert.match(css, /outline: var\(--lumux-focus-width\) solid var\(--lumux-focus-ring\)/);
});

test('tokens.embed.css carries exactly the 16-token subset', () => {
  const css = dist('tokens.embed.css');
  const host = css.slice(0, css.indexOf('}'));
  const names = [...host.matchAll(/--lumux-([a-z-]+):/g)].map((m) => m[1]);
  assert.equal(names.length, 16, names.join(', '));
  assert.ok(css.includes('var(--lumux-embed-accent,'));
});

test('tokens.host.css scopes everything to :host and carries no base rules', () => {
  const css = dist('tokens.host.css');
  for (const theme of THEME_NAMES) {
    for (const decl of themeBlock(theme)) assert.ok(css.includes(decl), `${theme} ${decl}`);
    if (theme !== SYSTEM_THEME.light) assert.ok(css.includes(`:host([data-theme="${theme}"])`), theme);
  }
  assert.ok(css.includes(':host(:not([data-theme]))'));
  assert.ok(css.includes(':host([data-density="dense"]), [data-density="dense"]'));
  assert.doesNotMatch(css, /:root|@layer|:focus-visible|input,/);
});

test('theme-init applies a stored theme and ignores anything else', () => {
  const run = (stored: string | null) => {
    const attrs: Record<string, string> = {};
    runInNewContext(dist('theme-init.js'), {
      localStorage: { getItem: () => stored },
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    });
    return attrs['data-theme'];
  };
  for (const theme of THEME_NAMES) assert.equal(run(theme), theme);
  assert.equal(run('violet'), undefined);
  assert.equal(run(null), undefined);
});

test('theme-init.sha256 is the CSP token of theme-init.js bytes', () => {
  const expected = `sha256-${createHash('sha256').update(dist('theme-init.js')).digest('base64')}`;
  assert.equal(dist('theme-init.sha256'), `${expected}\n`);
});

test('theme.css declares @source for the shipped components and a nested consumer needs none', () => {
  assert.match(dist('theme.css'), /^@source "\.\/react";$/m);
  const out = execFileSync(
    'npx',
    ['@tailwindcss/cli', '-i', 'tests/fixtures/nested/src/styles/app.css'],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  assert.match(out, /\.bg-overlay-scrim \{[^}]*background-color: var\(--lumux-overlay-scrim\)/);
  assert.match(out, /\.sm\\:max-w-dialog-md \{[^}]*max-width: var\(--lumux-dialog-md\)/);
});

test('Tailwind v4 generates the lumux utilities from theme.css', () => {
  const out = execFileSync(
    'npx',
    ['@tailwindcss/cli', '-i', 'tests/fixtures/app.css'],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const expect: Record<string, string> = {
    'bg-surface': 'background-color: var(--lumux-surface)',
    'text-body': 'font-size: var(--lumux-text-body)',
    'rounded-control': 'border-radius: var(--lumux-radius-control)',
    'size-target': 'width: var(--lumux-target-min)',
    'min-h-target': 'min-height: var(--lumux-target-min)',
    'z-modal': 'z-index: var(--lumux-z-modal)',
    'duration-base': 'transition-duration: var(--lumux-motion-base)',
    'safe-top': 'padding-top: var(--lumux-safe-top)',
    'fill-chart-3': 'fill: var(--lumux-chart-3)',
    'max-w-dialog-md': 'max-width: var(--lumux-dialog-md)',
    'max-w-sheet': 'max-width: var(--lumux-sheet-width)',
    'min-w-menu': 'min-width: var(--lumux-menu-min-width)',
  };
  for (const [cls, decl] of Object.entries(expect)) {
    const rule = new RegExp(`\\.${cls} \\{[^}]*${decl.replace(/[()]/g, '\\$&')}`);
    assert.match(out, rule, cls);
  }
});
