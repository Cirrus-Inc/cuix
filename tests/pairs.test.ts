import { test } from 'node:test';
import assert from 'node:assert/strict';
import { componentPairs, pairsIn } from '../scripts/component-pairs.ts';
import { PAIRS, SURFACES } from '../src/tokens/vocabulary.ts';

const listed = (fg: string, bg: string) => PAIRS.some((p) => p.fg === fg && p.bg === bg);
const show = (classes: string) => pairsIn(classes).map((p) => `${p.state}${p.fg}/${p.bg}`);

test('a state keeps the resting text or background it does not set', () => {
  assert.deepEqual(show('border bg-surface text-danger hover:bg-danger-soft'), [
    'danger/surface',
    'hover:danger/danger-soft',
  ]);
  assert.deepEqual(show('text-danger data-highlighted:bg-danger-soft data-highlighted:text-danger-on-soft'), [
    ...SURFACES.map((s) => `danger/${s}`),
    'data-highlighted:danger-on-soft/danger-soft',
  ]);
});

test('text with no background sits on every surface; utilities that are not colour tokens are ignored', () => {
  assert.deepEqual(show('text-body text-foreground-muted'), SURFACES.map((s) => `foreground-muted/${s}`));
  assert.deepEqual(show('size-1.5 rounded-pill bg-current text-label'), []);
  assert.deepEqual(show('bg-surface-raised p-0.5'), []);
});

test('a new hover background under existing text is caught when it is not a listed pair', () => {
  const added = pairsIn('text-accent hover:bg-accent-soft').filter((p) => !listed(p.fg, p.bg));
  assert.deepEqual(added.map((p) => `${p.state}${p.fg}/${p.bg}`), ['hover:accent/accent-soft']);
});

test('every pair the components render is listed in PAIRS', () => {
  const rendered = componentPairs();
  assert.ok(rendered.some((p) => p.file === 'Button.tsx' && p.state === 'hover:' && p.bg === 'danger-soft'));
  const unlisted = rendered.filter((p) => !listed(p.fg, p.bg)).map((p) => `${p.file} ${p.state}${p.fg}/${p.bg}`);
  assert.deepEqual(unlisted, []);
});
