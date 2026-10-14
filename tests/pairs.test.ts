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

test('a control edge sits on every surface at 3:1; the decorative border has no requirement', () => {
  const edges = (classes: string) => pairsIn(classes).map((p) => `${p.state}${p.fg}/${p.bg}@${p.min}`);
  assert.deepEqual(edges('border-2 border-border-strong aria-invalid:border-danger'), [
    ...SURFACES.map((s) => `border-strong/${s}@3`),
    ...SURFACES.map((s) => `aria-invalid:danger/${s}@3`),
  ]);
  assert.deepEqual(edges('border border-border bg-surface border-l-4'), []);
  assert.ok(edges('text-border').length > 0);
});

test('checkbox and radio draw every edge and mark with listed pairs', () => {
  const drawn = componentPairs().filter((p) => p.file === 'Checkbox.tsx' || p.file === 'RadioGroup.tsx');
  const has = (fg: string, bg: string, state = '') => drawn.some((p) => p.fg === fg && p.bg === bg && p.state === state);
  assert.ok(has('border-strong', 'surface'), 'unchecked edge');
  assert.ok(has('accent-foreground', 'accent'), 'checked mark');
  assert.ok(has('accent', 'surface'), 'radio dot');
  assert.ok(has('danger', 'surface', 'aria-invalid:'), 'invalid checkbox edge');
  assert.ok(has('danger', 'surface', 'group-aria-invalid:'), 'invalid radio edge');
  assert.ok(has('foreground-subtle', 'surface-raised', 'peer-disabled:'), 'disabled mark');
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
