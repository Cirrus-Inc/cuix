// Plain Node ESM, no bundler: what an SSR framework does with the installed package.
import { renderToString } from 'react-dom/server';
import * as react from '@cirrus/cuix/react';
import * as theme from '@cirrus/cuix/theme';
import { App, RENDERED } from './App.ts';
import { MapPage } from './Map.ts';

const components = Object.keys(react).filter((k) => /^[A-Z][a-z]/.test(k));
const missed = components.filter((k) => !RENDERED.includes(k));
if (missed.length) throw new Error(`exported but not rendered by tests/consumer/src/App.ts: ${missed.join(', ')}`);
if (!theme.THEME_NAMES.length) throw new Error('@cirrus/cuix/theme: THEME_NAMES is empty');

const html = renderToString(App());
for (const text of ['Save', 'No entries', 'Delete?', 'Agree']) {
  if (!html.includes(text)) throw new Error(`SSR output lacks "${text}"`);
}
const map = renderToString(MapPage());
if (!map.includes('FL 1') || !map.includes('role="switch"')) throw new Error('SSR of @cirrus/cuix/map lacks the state label or the layer switch');
console.log(`consumer-smoke: SSR rendered ${components.length} components, ${html.length} bytes`);
