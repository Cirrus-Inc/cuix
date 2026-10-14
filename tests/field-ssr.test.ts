import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { Field, Input } from '../dist/react/Field.js';

// The label must point at the control in server HTML, before any effect runs.
test('Field label targets the control in server-rendered HTML', () => {
  const own = renderToString(h(Field, { label: 'Phone', hint: 'Mobile', children: h(Input, { id: 'phone' }) }));
  assert.match(own, /<label for="phone"/);
  assert.match(own, /<input id="phone" aria-describedby="[^"]+-hint"/);
  const field = renderToString(h(Field, { label: 'Email', id: 'email', children: h(Input, {}) }));
  assert.match(field, /<label for="email"/);
  assert.match(field, /<input id="email"/);
});
