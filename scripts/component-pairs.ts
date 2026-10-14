// The fg/bg pairs the shipped components render, read from the class strings in
// src/react. Within one string, a state (`hover:`, `disabled:`, ...) keeps the
// resting text or background it does not set; text with no background sits on
// each surface. A control edge (`border-*`) sits on each surface at the non-text
// minimum; `border` itself is decorative and has no requirement. check-contrast
// fails on any pair PAIRS does not list.

import { readdirSync, readFileSync } from 'node:fs';
import { COLOR_TOKENS, NON_TEXT_MIN, SURFACES, TEXT_MIN, type ColorToken } from '../src/tokens/vocabulary.ts';

export type RenderedPair = { fg: ColorToken; bg: ColorToken; min: number; state: string };

const isToken = (v: string): v is ColorToken => (COLOR_TOKENS as readonly string[]).includes(v);

export function pairsIn(classes: string): RenderedPair[] {
  const states = new Map<string, { text?: ColorToken; bg?: ColorToken; border?: ColorToken }>();
  for (const cls of classes.split(/\s+/)) {
    const at = cls.lastIndexOf(':') + 1;
    const m = /^(text|bg|border)-(.+)$/.exec(cls.slice(at));
    if (!m || !isToken(m[2]) || (m[1] === 'border' && m[2] === 'border')) continue;
    const state = cls.slice(0, at);
    states.set(state, { ...states.get(state), [m[1]]: m[2] });
  }
  const rest = states.get('') ?? {};
  return [...states].flatMap(([state, s]) => {
    const fg = s.text ?? rest.text;
    const bg = s.bg ?? rest.bg;
    const edge = s.border;
    return [
      ...(fg ? (bg ? [bg] : SURFACES).map((b) => ({ fg, bg: b, min: TEXT_MIN, state })) : []),
      ...(edge ? SURFACES.map((b) => ({ fg: edge, bg: b, min: NON_TEXT_MIN, state })) : []),
    ];
  });
}

const REACT = new URL('../src/react/', import.meta.url);

export function componentPairs(): (RenderedPair & { file: string })[] {
  return readdirSync(REACT)
    .filter((f) => f.endsWith('.tsx'))
    .flatMap((file) => {
      const src = readFileSync(new URL(file, REACT), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      return [...src.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].flatMap((m) =>
        pairsIn(m[1] ?? m[2] ?? m[3]).map((p) => ({ ...p, file })),
      );
    });
}
