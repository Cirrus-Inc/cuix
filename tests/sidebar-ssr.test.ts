import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

// Imported at run time: dist/ does not exist when `tsc --noEmit` runs on a fresh checkout.
const built = '../dist/react/Sidebar.js';
const builtTooltip = '../dist/react/Tooltip.js';

test('Sidebar renders a named nav with aria-current and visible labels', async () => {
  const { Sidebar, SidebarSection, SidebarItem } = await import(built);
  const html = renderToString(
    h(Sidebar, { label: 'Main', children: h(SidebarSection, { label: 'Work', children: [
      h(SidebarItem, { key: 'a', href: '/a', icon: h('svg'), label: 'Inbox', count: 3, current: true }),
      h(SidebarItem, { key: 'b', href: '/b', icon: h('svg'), label: 'Reports' }),
    ] }) }),
  );
  assert.match(html, /<nav aria-label="Main"/);
  assert.match(html, /<a [^>]*aria-current="page"[^>]*>/);
  assert.equal(html.match(/aria-current/g)?.length, 1);
  assert.match(html, /role="group" aria-label="Work"/);
  assert.doesNotMatch(html, /sr-only/);
  assert.match(html, /<p aria-hidden="true"[^>]*>Work<\/p>/);
});

test('collapsed Sidebar keeps labels and counts for assistive tech only', async () => {
  const { Sidebar, SidebarSection, SidebarItem, SidebarToggle } = await import(built);
  const { TooltipProvider } = await import(builtTooltip);
  const html = renderToString(
    h(TooltipProvider, null, h(Sidebar, {
      collapsed: true,
      footer: h(SidebarToggle, { collapsed: true, onCollapsedChange: () => {} }),
      children: h(SidebarSection, { label: 'Work', children: h(SidebarItem, { href: '/a', icon: h('svg'), label: 'Inbox', count: 3, current: true }) }),
    })),
  );
  assert.match(html, /<span class="sr-only">Inbox<\/span>/);
  assert.match(html, /<span class="sr-only">3<\/span>/);
  assert.doesNotMatch(html, /<p aria-hidden/);
  assert.match(html, /aria-label="Work"/);
  assert.match(html, /aria-label="Expand sidebar"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="sidebar"/);
});

test('AppShell passes collapsed to a Sidebar that does not set it', async () => {
  const { AppShell } = await import('../dist/react/AppShell.js');
  const { Sidebar, SidebarItem } = await import(built);
  const { TooltipProvider } = await import(builtTooltip);
  const html = renderToString(
    h(TooltipProvider, null, h(AppShell, {
      collapsed: true,
      sidebar: h(Sidebar, { children: h(SidebarItem, { href: '/a', icon: h('svg'), label: 'Inbox' }) }),
      children: h('p', null, 'x'),
    })),
  );
  assert.match(html, /<span class="sr-only">Inbox<\/span>/);
  assert.match(html, /class="[^"]*\btop-0\b[^"]*w-rail/);
});

test('SidebarItem outside a Sidebar renders expanded; asChild renders the child', async () => {
  const { SidebarItem } = await import(built);
  const plain = renderToString(h(SidebarItem, { href: '/a', icon: h('svg'), label: 'Inbox' }));
  assert.doesNotMatch(plain, /sr-only/);
  const linked = renderToString(h(SidebarItem, { asChild: true, icon: h('svg'), label: 'Inbox', current: true, children: h('a', { href: '/x' }) }));
  assert.match(linked, /<a href="\/x"[^>]*aria-current="page"[^>]*>.*Inbox/);
});

test('SidebarToggle names its action and controls the sidebar', async () => {
  const { SidebarToggle } = await import(built);
  const open = renderToString(h(SidebarToggle, { collapsed: false, onCollapsedChange: () => {} }));
  assert.match(open, /aria-label="Collapse sidebar"/);
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /aria-controls="sidebar"/);
  const custom = renderToString(h(SidebarToggle, { collapsed: true, controls: 'nav', onCollapsedChange: () => {}, labels: { expand: 'Abrir', collapse: 'Cerrar' } }));
  assert.match(custom, /aria-label="Abrir"/);
  assert.match(custom, /aria-controls="nav"/);
});

test('useStoredBoolean returns its initial value on the server', async () => {
  const { useStoredBoolean } = await import(built);
  const Probe = () => h('p', null, String(useStoredBoolean('k', true)[0]));
  assert.match(renderToString(h(Probe)), />true</);
});
