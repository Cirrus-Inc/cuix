import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { cameraKey, clusterName, clusterProperties, clusterSummary, layerRanks, pinZ, tipFor, watchView, wrapBBox, type ViewSource } from '../src/map/street/view.ts';

// A map that only moves when told to: `movestart`/`moveend` listeners and a settable view.
function fakeMap(moving = false) {
  const listeners = new Set<() => void>();
  const starts = new Set<() => void>();
  let view = { w: -82, s: 30, e: -81, n: 31, zoom: 9 };
  const map: ViewSource = {
    on: (t, fn) => (t === 'moveend' ? listeners : starts).add(fn),
    off: (t, fn) => (t === 'moveend' ? listeners : starts).delete(fn),
    isMoving: () => moving,
    getBounds: () => ({ getWest: () => view.w, getSouth: () => view.s, getEast: () => view.e, getNorth: () => view.n }),
    getZoom: () => view.zoom,
  };
  const move = (next: Partial<typeof view>) => {
    moving = false;
    view = { ...view, ...next };
    for (const fn of listeners) fn();
  };
  const start = () => {
    moving = true;
    for (const fn of starts) fn();
  };
  return { map, move, start, listeners, starts };
}

test('watchView fires once after mount with the initial view, debounced', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { map } = fakeMap();
  const cb = mock.fn();
  watchView(map, cb);
  t.mock.timers.tick(199);
  assert.equal(cb.mock.callCount(), 0);
  t.mock.timers.tick(1);
  assert.equal(cb.mock.callCount(), 1);
  assert.deepEqual(cb.mock.calls[0].arguments[0], { bbox: [-82, 30, -81, 31], zoom: 9 });
});

test('watchView waits for an initial fit in flight and reports the fitted view', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { map, move } = fakeMap(true);
  const cb = mock.fn();
  watchView(map, cb);
  t.mock.timers.tick(1000);
  assert.equal(cb.mock.callCount(), 0);
  move({ zoom: 11 });
  t.mock.timers.tick(200);
  assert.equal(cb.mock.callCount(), 1);
  assert.equal(cb.mock.calls[0].arguments[0].zoom, 11);
});

test('watchView coalesces a burst of moveends into one call with the settled view, and unsubscribes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { map, move, listeners } = fakeMap();
  const cb = mock.fn();
  const stop = watchView(map, cb);
  t.mock.timers.tick(200);
  move({ zoom: 10 });
  t.mock.timers.tick(100);
  move({ zoom: 12, w: -81.8 });
  t.mock.timers.tick(199);
  assert.equal(cb.mock.callCount(), 1);
  t.mock.timers.tick(1);
  assert.equal(cb.mock.callCount(), 2);
  assert.deepEqual(cb.mock.calls[1].arguments[0], { bbox: [-81.8, 30, -81, 31], zoom: 12 });
  move({ zoom: 13 });
  stop();
  t.mock.timers.tick(1000);
  assert.equal(cb.mock.callCount(), 2, 'a pending call is cancelled');
  assert.equal(listeners.size, 0);
});

test('watchView: a move started within the debounce cancels the pending call (trailing debounce)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { map, move, start, starts } = fakeMap();
  const cb = mock.fn();
  const stop = watchView(map, cb);
  t.mock.timers.tick(200);
  move({ zoom: 10 });
  t.mock.timers.tick(150);
  start();
  t.mock.timers.tick(1000);
  assert.equal(cb.mock.callCount(), 1, 'nothing is reported mid-gesture');
  move({ zoom: 11 });
  t.mock.timers.tick(200);
  assert.equal(cb.mock.callCount(), 2);
  assert.equal(cb.mock.calls[1].arguments[0].zoom, 11);
  stop();
  assert.equal(starts.size, 0);
});

test('watchView wraps bbox longitudes into [-180, 180]', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { map, move } = fakeMap();
  const cb = mock.fn();
  watchView(map, cb);
  move({ w: -190, e: -150 });
  t.mock.timers.tick(200);
  assert.deepEqual(cb.mock.calls.at(-1)?.arguments[0].bbox, [170, 30, -150, 31], 'across the antimeridian: west > east');
  assert.deepEqual(wrapBBox(-82, 30, -81, 31), [-82, 30, -81, 31]);
  assert.deepEqual(wrapBBox(-400, -60, 100, 80), [-180, -60, 180, 80], 'a full turn or more is the whole world');
  assert.deepEqual(wrapBBox(170, 0, 200, 10), [170, 0, -160, 10]);
});

test('cameraKey fits the pins once, so pins fetched for the view never refit the camera', () => {
  let key = cameraKey(null, undefined, undefined, 12, false);
  assert.equal(key, null, 'no pins yet: nothing to fit');
  key = cameraKey(key, undefined, undefined, 12, true);
  assert.equal(key, 'pins', 'the first non-empty pins fit');
  assert.equal(cameraKey(key, undefined, undefined, 12, true), key, 'a new set of pins keeps the key: no refit');
  assert.equal(cameraKey(key, undefined, undefined, 12, false), key, 'an empty refetch does not unlatch it');
  const b = cameraKey(key, [[-82, 30], [-81, 31]], undefined, 12, true);
  assert.notEqual(b, key, 'bounds take over');
  assert.equal(cameraKey(b, [[-82, 30], [-81, 31]], undefined, 12, true), b, 'equal bounds in a new array: no refit');
  assert.notEqual(cameraKey(b, [[-83, 30], [-81, 31]], undefined, 12, true), b, 'new bounds: refit');
  const c = cameraKey(null, undefined, { lng: -81.6, lat: 30.3 }, 12, true);
  assert.notEqual(cameraKey(c, undefined, { lng: -81.6, lat: 30.3 }, 13, true), c, 'a new zoom with center moves');
});

const LAYERS = [
  { id: 'school', label: 'Schools', shape: 'square' as const },
  { id: 'customer', label: 'Customers', shape: 'diamond' as const },
];

test('layers array order is the stacking order: the last layer is on top', () => {
  const ranks = layerRanks(LAYERS);
  assert.ok(pinZ(ranks.get('customer')) > pinZ(ranks.get('school')));
  assert.ok(pinZ(ranks.get('school')) > pinZ(ranks.get('unknown')), 'a pin of an unknown layer is at the bottom');
  const swapped = layerRanks([...LAYERS].reverse());
  assert.ok(pinZ(swapped.get('school')) > pinZ(swapped.get('customer')));
});

test('a cluster takes the top-most layer present among its members', () => {
  const props = clusterProperties(LAYERS);
  assert.deepEqual(props.top, ['max', ['get', 'z']]);
  assert.deepEqual(props.n1, ['+', ['case', ['==', ['get', 'z'], 1], 1, 0]]);
  // MapLibre reduces those expressions over the members; these are the results it hands back.
  const mixed = clusterSummary(LAYERS, { cluster: true, point_count: 12, top: 1, n0: 11, n1: 1 });
  assert.equal(mixed.layer?.id, 'customer', 'one customer among eleven schools still colours the bubble');
  assert.deepEqual(mixed.layers, [
    ['customer', 1],
    ['school', 11],
  ]);
  assert.equal(clusterName(12, mixed, LAYERS), '12 pins: Customers 1, Schools 11');
  const schools = clusterSummary(LAYERS, { top: 0, n0: 5, n1: 0 });
  assert.equal(schools.layer?.id, 'school');
  assert.deepEqual(schools.layers, [['school', 5]]);
  assert.equal(clusterSummary(LAYERS, { top: -1 }).layer, undefined, 'no known layer: the neutral colour');
});

test('the tooltip defaults to the pin label', () => {
  const pin = { id: '1', lat: 30.3, lng: -81.6, layer: 'school', label: 'Ribault High, Duval' };
  assert.equal(tipFor(pin), 'Ribault High, Duval');
  assert.equal(tipFor(pin, (p) => `${p.label} (customer)`), 'Ribault High, Duval (customer)');
});

// Imported from dist at run time: dist/ does not exist when `tsc --noEmit` runs on a fresh checkout.
const builtStreet = '../dist/map/street/index.js';

test('StreetMap server-renders with the new props and still loads no maplibre-gl', async () => {
  const { StreetMap } = await import(builtStreet);
  const html = renderToString(
    h(StreetMap, {
      label: 'Duval County',
      layers: LAYERS,
      pins: [{ id: '1', lat: 30.3, lng: -81.6, layer: 'customer', label: 'A school' }],
      cluster: { radius: 40, maxZoom: 13 },
      tooltip: (p: { label: string }) => p.label,
      onMoveEnd: () => {},
      onSelectCluster: () => {},
    }),
  );
  assert.match(html, /role="region" aria-label="Duval County"/);
});
