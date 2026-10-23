import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import {
  bubbleZ,
  cameraKey,
  clusterHits,
  clusterName,
  clusterProperties,
  clusterSummary,
  clusteredSet,
  layerRanks,
  pinZ,
  splitPins,
  tipFor,
  tipZ,
  unclusteredPinZ,
  watchClusters,
  watchView,
  wrapBBox,
  type ClusterSource,
  type SourceFeature,
  type ViewSource,
} from '../src/map/street/view.ts';

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

const THREE = [...LAYERS, { id: 'interpreter', label: 'Interpreters' }];
const PINS = [
  { id: 's1', lat: 30.3, lng: -81.6, layer: 'school', label: 'S1' },
  { id: 'i1', lat: 30.3, lng: -81.6, layer: 'interpreter', label: 'I1' },
  { id: 'c1', lat: 30.31, lng: -81.61, layer: 'customer', label: 'C1' },
];

test('cluster.layers: a pin of an excluded layer never enters the clustered source', () => {
  const only = clusteredSet(['school', 'customer']);
  const { clustered, free } = splitPins(PINS, only);
  assert.deepEqual(
    clustered.map((p) => p.id),
    ['s1', 'c1'],
  );
  assert.deepEqual(
    free.map((p) => p.id),
    ['i1'],
  );
  assert.deepEqual(splitPins(PINS, clusteredSet([])).clustered, [], 'an empty list clusters nothing');
});

test('cluster.layers: bubble swatch and counts come from the clustered layers only', () => {
  const only = clusteredSet(['school', 'customer']);
  const props = clusterProperties(THREE, only);
  assert.ok('n0' in props && 'n1' in props);
  assert.ok(!('n2' in props), 'no count for the interpreter layer');
  // Even if MapLibre handed back an interpreter rank, the bubble would not take it.
  const s = clusterSummary(THREE, { top: 2, n0: 4, n1: 1, n2: 3 }, only);
  assert.equal(s.layer, undefined);
  assert.deepEqual(s.layers, [
    ['customer', 1],
    ['school', 4],
  ]);
  const real = clusterSummary(THREE, { top: 1, n0: 4, n1: 1 }, only);
  assert.equal(real.layer?.id, 'customer');
  assert.equal(clusterName(5, real, THREE), '5 pins: Customers 1, Schools 4');
});

test('cluster.layers omitted: every layer clusters, as before', () => {
  assert.equal(clusteredSet(undefined), null);
  const { clustered, free } = splitPins(PINS, null);
  assert.equal(clustered.length, 3);
  assert.equal(free.length, 0);
  assert.deepEqual(clusterProperties(THREE), clusterProperties(THREE, null));
  assert.deepEqual(Object.keys(clusterProperties(THREE)).sort(), ['n0', 'n1', 'n2', 'top']);
  const s = clusterSummary(THREE, { top: 2, n0: 4, n2: 3 });
  assert.equal(s.layer?.id, 'interpreter');
  assert.deepEqual(s.layers, [
    ['interpreter', 3],
    ['school', 4],
  ]);
});

test('z order: unclustered pins sit above every bubble and clustered pin, by layer rank; the tooltip above all', () => {
  const n = THREE.length;
  const ranks = layerRanks(THREE);
  const topClustered = Math.max(...THREE.map((l) => pinZ(ranks.get(l.id))));
  assert.ok(bubbleZ(n) > topClustered);
  assert.ok(unclusteredPinZ(ranks.get('school'), n) > bubbleZ(n), 'even the lowest layer, when unclustered, is above the bubbles');
  assert.ok(unclusteredPinZ(ranks.get('interpreter'), n) > unclusteredPinZ(ranks.get('school'), n));
  assert.ok(unclusteredPinZ(ranks.get('unknown'), n) > bubbleZ(n));
  assert.ok(tipZ(n) > unclusteredPinZ(ranks.get('interpreter'), n));
});

test('the tooltip defaults to the pin label', () => {
  const pin = { id: '1', lat: 30.3, lng: -81.6, layer: 'school', label: 'Ribault High, Duval' };
  assert.equal(tipFor(pin), 'Ribault High, Duval');
  assert.equal(tipFor(pin, (p) => `${p.label} (customer)`), 'Ribault High, Duval (customer)');
});

const pt = (lng: number, lat: number, properties: Record<string, unknown>): SourceFeature => ({ geometry: { type: 'Point', coordinates: [lng, lat] }, properties });
const bubble = (id: number, lng: number, lat: number, n: number) => pt(lng, lat, { cluster: true, cluster_id: id, point_count: n });

test('clusterHits dedupes features repeated across tiles and keeps only what is in view', () => {
  const inView = ([lng]: [number, number]) => lng > -82;
  const { pins, clusters } = clusterHits(
    [bubble(7, -81.5, 30, 3), bubble(7, -81.5, 30, 3), bubble(9, -81.4, 30.5, 2), bubble(11, -83, 30, 4), pt(-81.6, 30.1, { id: 'a' }), pt(-81.6, 30.1, { id: 'a' }), pt(-83, 30, { id: 'off' })],
    inView,
  );
  assert.deepEqual([...pins], ['a']);
  assert.deepEqual(
    clusters.map((c) => c.id),
    [9, 7],
    'north to south, the off-screen bubble dropped',
  );
});

// A map that fires the cluster events when told to; the test stands in for its tile pyramid.
function fakeClusterMap() {
  const on = new Map<string, Set<(e: { sourceId?: string }) => void>>();
  const map: ClusterSource = {
    on: (t, fn) => on.set(t, (on.get(t) ?? new Set()).add(fn)),
    off: (t, fn) => on.get(t)?.delete(fn),
    isSourceLoaded: () => true,
  };
  const fire = (t: string, e: { sourceId?: string } = {}) => {
    for (const fn of on.get(t) ?? []) fn(e);
  };
  return { map, fire, on };
}

test('watchClusters: the idle pass after a zoom drops a parent bubble shown next to its children (cuix#85)', () => {
  const { map, fire, on } = fakeClusterMap();
  // z10: one bubble of 6. Zoomed to z11: it splits into a bubble of 4 and a pin pair.
  const parent = bubble(330, -82.46, 27.95, 6);
  const children = [bubble(1000, -82.45, 27.96, 4), pt(-82.47, 27.94, { id: 'i1' }), pt(-82.47, 27.94, { id: 'i2' })];
  let tiles: SourceFeature[] = [parent];
  let shown: ReturnType<typeof clusterHits> = { pins: new Set(), clusters: [] };
  const stop = watchClusters(map, 'pins', () => (shown = clusterHits(tiles, () => true)));

  fire('moveend');
  // The last ideal tile loads: `sourcedata` fires while the parent tile is still retained as cover.
  tiles = [parent, ...children];
  fire('sourcedata', { sourceId: 'pins' });
  assert.deepEqual(
    shown.clusters.map((c) => c.id),
    [1000, 330],
    'the stale parent is still in the query here',
  );
  // The next frame releases the parent and fires no sourcedata; then the map goes idle.
  tiles = children;
  fire('sourcedata', { sourceId: 'basemap' });
  assert.ok(shown.clusters.some((c) => c.id === 330), 'another source loading does not refresh');
  fire('idle');
  assert.deepEqual(
    shown.clusters.map((c) => c.id),
    [1000],
    'the parent bubble is gone',
  );
  assert.deepEqual([...shown.pins].sort(), ['i1', 'i2']);

  stop();
  for (const fns of on.values()) assert.equal(fns.size, 0, 'every listener is removed');
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
      cluster: { radius: 40, maxZoom: 13, layers: ['school'] },
      tooltip: (p: { label: string }) => p.label,
      onMoveEnd: () => {},
      onSelectCluster: () => {},
    }),
  );
  assert.match(html, /role="region" aria-label="Duval County"/);
});
