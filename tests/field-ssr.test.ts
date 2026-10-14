import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

// The label must point at the control in server HTML, before any effect runs.
// Imported at run time: dist/ does not exist when `tsc --noEmit` runs on a fresh checkout.
const built = '../dist/react/Field.js';

test('Field label targets the control in server-rendered HTML', async () => {
  const { Field, Input } = await import(built);
  const own = renderToString(h(Field, { label: 'Phone', hint: 'Mobile', children: h(Input, { id: 'phone' }) }));
  assert.match(own, /<label for="phone"/);
  assert.match(own, /<input id="phone" aria-describedby="[^"]+-hint"/);
  const field = renderToString(h(Field, { label: 'Email', id: 'email', children: h(Input, {}) }));
  assert.match(field, /<label for="email"/);
  assert.match(field, /<input id="email"/);
});
