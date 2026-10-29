import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { albersUsa } from '../src/map/albersUsa.ts';
import { groupPoints } from '../src/map/groupPoints.ts';
import {
  DRAG_THRESHOLD,
  WHEEL_MAX,
  ZERO,
  ZOOM_MAX,
  ZOOM_MIN,
  cameraFor,
  clampShift,
  clampZoom,
  clientToView,
  intersects,
  isDrag,
  panBy,
  pathBBox,
  screenRect,
  shapePoints,
  stepZoom,
  viewCamera,
  visibleRect,
  wheelZoomFactor,
  zoomAbout,
  zoomCamera,
} from '../src/map/mapMath.ts';
import { US_STATES } from '../src/map/geo/usStates.ts';

// Reference values produced by d3-geo 3.1.1 geoAlbersUsa().scale(1300).translate([487.5, 305])
// (HIVE tests/unit/albers-usa.test.ts).
const CASES: [string, number, number, [number, number] | null][] = [
  ['Jacksonville FL', -81.6557, 30.3322, [777.3738747552547, 475.16281412698766]],
  ['Las Vegas NV', -115.1398, 36.1699, [153.0438101088459, 328.14314898347607]],
  ['Seattle WA', -122.3321, 47.6062, [97.6249669465995, 46.31865922997736]],
  ['Anchorage AK', -149.9003, 61.2181, [112.277427569713, 544.2779162203778]],
  ['Honolulu HI', -157.8583, 21.3069, [266.95994676863154, 549.1903729395863]],
  ['Portland ME', -70.2568, 43.6591, [913.6329784437902, 135.00835201011148]],
  ['Key West FL', -81.78, 24.5551, [794.4058866029709, 604.4524932255463]],
  ['San Juan PR (no piece)', -66.1057, 18.4655, null],
  ['Atlantic, far from land', -50, 35, null],
];

test('albersUsa matches d3-geo geoAlbersUsa at the map scale', () => {
  for (const [name, lng, lat, want] of CASES) {
    const got = albersUsa(lng, lat);
    if (want === null) {
      assert.equal(got, null, name);
      continue;
    }
    assert.ok(got, name);
    assert.ok(Math.abs(got[0] - want[0]) < 0.005 && Math.abs(got[1] - want[1]) < 0.005, `${name}: ${String(got)}`);
  }
});

test('a projected city lands inside its state box', () => {
  const fl = US_STATES.find((s) => s.iso === 'US-FL');
  assert.ok(fl);
  const b = pathBBox(fl.d);
  const p = albersUsa(-81.65, 30.33);
  assert.ok(p && p[0] >= b.x && p[0] <= b.x + b.width && p[1] >= b.y && p[1] <= b.y + b.height);
});

test('camera fits a box and visibleRect inverts it', () => {
  const view = { width: 975, height: 610 };
  const box = { x: 100, y: 100, width: 50, height: 25 };
  const cam = cameraFor(box, view, 0);
  const seen = visibleRect(cam, view);
  assert.ok(Math.abs(seen.x + seen.width / 2 - 125) < 1e-9);
  assert.ok(Math.abs(seen.y + seen.height / 2 - 112.5) < 1e-9);
  assert.ok(intersects(seen, box));
  assert.ok(!intersects(seen, { x: 900, y: 500, width: 1, height: 1 }));
  assert.equal(shapePoints('circle', 0, 0, 1), null);
  assert.equal(shapePoints('triangle', 0, 0, 1)?.split(' ').length, 3);
});

test('zoomCamera scales the fit about the centre of the view', () => {
  const view = { width: 975, height: 610 };
  const fit = cameraFor({ x: 600, y: 300, width: 200, height: 150 }, view);
  assert.deepEqual(zoomCamera(fit, 1, view), fit);
  const cam = zoomCamera(fit, 2, view);
  assert.equal(cam.k, fit.k * 2);
  const centre = (c: typeof fit) => {
    const r = visibleRect(c, view);
    return [r.x + r.width / 2, r.y + r.height / 2];
  };
  const [ax, ay] = centre(fit);
  const [bx, by] = centre(cam);
  assert.ok(Math.abs(ax - bx) < 1e-9 && Math.abs(ay - by) < 1e-9, 'the centre stays put');
  // Out of range clamps: below 1 is the fit, above ZOOM_MAX is ZOOM_MAX.
  assert.deepEqual(zoomCamera(fit, 0.25, view), fit);
  assert.equal(zoomCamera(fit, 100, view).k, fit.k * ZOOM_MAX);
});

test('clampZoom and stepZoom stay within [1, 8]', () => {
  assert.equal(clampZoom(0), ZOOM_MIN);
  assert.equal(clampZoom(Number.NaN), ZOOM_MIN);
  assert.equal(clampZoom(Infinity), ZOOM_MIN);
  assert.equal(clampZoom(9), ZOOM_MAX);
  assert.equal(clampZoom(3), 3);
  assert.equal(stepZoom(1, 1), 1.5);
  assert.equal(stepZoom(1.5, -1), 1);
  assert.equal(stepZoom(1, -1), ZOOM_MIN);
  assert.equal(stepZoom(7, 1), ZOOM_MAX);
  let z = ZOOM_MIN;
  for (let i = 0; i < 10; i++) z = stepZoom(z, 1);
  assert.equal(z, ZOOM_MAX);
  for (let i = 0; i < 10; i++) z = stepZoom(z, -1);
  assert.equal(z, ZOOM_MIN);
});

test('visibleRect under zoom shrinks around the centre and culls the edges', () => {
  const view = { width: 975, height: 610 };
  const fit = cameraFor({ x: 0, y: 0, width: 975, height: 610 }, view, 0);
  const whole = visibleRect(fit, view);
  const seen = visibleRect(zoomCamera(fit, 4, view), view);
  assert.ok(Math.abs(seen.width - whole.width / 4) < 1e-9 && Math.abs(seen.height - whole.height / 4) < 1e-9);
  const corner = { x: 10, y: 10, width: 20, height: 20 };
  const middle = { x: 480, y: 300, width: 10, height: 10 };
  assert.ok(intersects(whole, corner));
  assert.ok(!intersects(seen, corner), 'a corner county leaves the view at 4x');
  assert.ok(intersects(seen, middle));
});

test('groupPoints merges points on one spot, names and sorts the group', () => {
  const items = [
    { id: 'b', name: 'Bea', lat: 30.3322, lng: -81.6557 },
    { id: 'a', name: 'Ann', lat: 30.3322, lng: -81.6557 },
    { id: 'c', name: 'Cy', lat: 36.1699, lng: -115.1398 },
    { id: 'pr', name: 'Off map', lat: 18.4655, lng: -66.1057 },
  ];
  const groups = groupPoints(items);
  assert.equal(groups.length, 2);
  const jax = groups.find((g) => g.count === 2);
  assert.ok(jax);
  assert.equal(jax.id, 'a');
  assert.equal(jax.name, 'Ann and 1 more');
  assert.deepEqual(jax.members.map((m) => m.id), ['a', 'b']);
  assert.equal(groupPoints(items, { name: (m) => `${String(m.length)} interpreters` }).find((g) => g.count === 2)?.name, '2 interpreters');
  // A wide cell clusters by density: Jacksonville and Las Vegas are ~620 units apart.
  assert.equal(groupPoints(items, { cell: 2000 }).length, 1);
});

// Components are imported from dist at run time: dist/ does not exist when `tsc --noEmit` runs.
const built = '../dist/map/index.js';
const builtStreet = '../dist/map/street/index.js';

test('UsMap renders states as links or buttons, with labels, on the server', async () => {
  const { UsMap } = await import(built);
  const html = renderToString(
    h(UsMap, {
      level: { kind: 'us' },
      label: 'Districts by state',
      states: [
        { fips: '12', bucket: 'solid', name: 'Florida: 12 districts', label: 'FL 12', href: '/d/fl' },
        { fips: '32', bucket: 'tint', name: 'Nevada: 1 district' },
      ],
      onSelect: () => {},
    }),
  );
  assert.match(html, /role="group" aria-label="Districts by state"/);
  assert.match(html, /<a href="\/d\/fl" aria-label="Florida: 12 districts"/);
  assert.match(html, /<a role="button" tabindex="0" aria-label="Nevada: 1 district"/);
  assert.match(html, />FL 12</);
  assert.match(html, /<style[^>]*cuix-map/);
  assert.doesNotMatch(html, /class="[^"]*\b(fill|stroke|bg|text)-/, 'no theme utility classes');
});

test('UsMap zoom controls: state level only, named, disabled at the clamps, optional', async () => {
  const { UsMap } = await import(built);
  const base = { label: 'Florida', states: [], onSelect: () => {}, loadCounties: () => new Promise(() => {}) };
  const us = renderToString(h(UsMap, { ...base, level: { kind: 'us' } }));
  assert.doesNotMatch(us, /aria-label="Zoom/);
  const fit = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' } }));
  assert.match(fit, /role="group" aria-label="Zoom"/);
  assert.match(fit, /<button type="button" aria-label="Zoom in" class/);
  assert.match(fit, /aria-label="Zoom out" aria-disabled="true"/);
  assert.match(fit, /aria-disabled="true"[^>]*>Fit<\/button>/);
  const max = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' }, zoom: 8 }));
  assert.match(max, /aria-label="Zoom in" aria-disabled="true"/);
  assert.doesNotMatch(max, /aria-label="Zoom out" aria-disabled/);
  assert.match(max, /scale\(/);
  const off = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' }, zoomControls: false }));
  assert.doesNotMatch(off, /aria-label="Zoom/);
  const named = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' }, zoomLabels: { zoomIn: 'Acercar', fit: 'Ajustar' } }));
  assert.match(named, /aria-label="Acercar"/);
  assert.match(named, />Ajustar<\/button>/);
});

test('UsMap gestures: the map is a tab stop at the state level, default on, off with gestures={false}', async () => {
  const { UsMap } = await import(built);
  const base = { label: 'Florida', states: [], onSelect: () => {}, loadCounties: () => new Promise(() => {}) };
  const on = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' } }));
  assert.match(on, /<svg[^>]*tabindex="0"[^>]*class="[^"]*cuix-map-gestures/);
  const off = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' }, gestures: false }));
  assert.doesNotMatch(off, /<svg[^>]*(tabindex|cuix-map-gestures)/);
  const us = renderToString(h(UsMap, { ...base, level: { kind: 'us' } }));
  assert.doesNotMatch(us, /<svg[^>]*(tabindex|cuix-map-gestures)/);
});

test('UsMap selected draws nothing at the US level or before the shapes load', async () => {
  const { UsMap } = await import(built);
  const base = { label: 'Florida', states: [], counties: [{ fips: '12031', bucket: 'none', name: 'Duval' }], onSelect: () => {}, loadCounties: () => new Promise(() => {}), selected: '12031' };
  const us = renderToString(h(UsMap, { ...base, level: { kind: 'us' } }));
  assert.doesNotMatch(us, /cuix-map-ring-(band|line)"/);
  const loading = renderToString(h(UsMap, { ...base, level: { kind: 'state', iso: 'US-FL' } }));
  assert.doesNotMatch(loading, /cuix-map-ring-(band|line)"/);
});

test('LayersPanel renders one switch per layer, controlled, with a disabled hint', async () => {
  const { LayersPanel } = await import(built);
  const html = renderToString(
    h(LayersPanel, {
      layers: [
        { id: 'schools', label: 'Schools', count: 12, shape: 'square' },
        { id: 'deaf', label: 'Deaf students', disabled: true, hint: 'Later' },
      ],
      value: { schools: true, deaf: true },
      onChange: () => {},
    }),
  );
  assert.match(html, /role="group" aria-labelledby/);
  assert.match(html, /role="switch" aria-checked="true"[^>]*>.*Schools.*12/);
  assert.match(html, /role="switch" aria-checked="false" aria-disabled="true"[^>]*>.*Deaf students.*Later/);
});

test('StreetMap server-renders a named region without loading maplibre-gl', async () => {
  const { StreetMap, OPENFREEMAP_LIBERTY } = await import(builtStreet);
  assert.equal(OPENFREEMAP_LIBERTY, 'https://tiles.openfreemap.org/styles/liberty');
  const html = renderToString(h(StreetMap, { label: 'Duval County', pins: [{ id: '1', lat: 30.3, lng: -81.6, layer: 'schools', label: 'A school' }] }));
  assert.match(html, /role="region" aria-label="Duval County"/);
});

test('the map subpath imports neither the theme, the React components, Radix nor maplibre-gl', () => {
  const dir = new URL('../dist/map/', import.meta.url);
  // Recursive: street/ and geo/ are part of the subpath too.
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.js'));
  assert.ok(files.includes('street/StreetMap.js') && files.includes('geo/counties/US-FL.js'), 'walks the whole subpath');
  for (const f of files) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /(from |import\()['"]((\.\.\/)+(react|theme)\b|@cirrus\/cuix|@radix-ui|lucide-react)/, f);
    if (f.startsWith('street/')) continue;
    assert.doesNotMatch(src, /(from |import\()['"]maplibre-gl/, `${f} loads maplibre-gl`);
    assert.doesNotMatch(src, /(from |import\()['"][^'"]*street/, `${f} reaches the street subpath`);
  }
  const street = readFileSync(new URL('street/StreetMap.js', dir), 'utf8');
  assert.doesNotMatch(street, /from ['"]maplibre-gl['"]/, 'maplibre-gl is imported statically');
  assert.match(street, /import\(['"]maplibre-gl['"]\)/);
});

test('MapRegion shade replaces the fill, keeps an outline class, and detail is a title', async () => {
  const { UsMap, MapSwatch } = await import(built);
  const html = renderToString(
    h(UsMap, {
      level: { kind: 'us' },
      label: 'Students by state',
      states: [
        { fips: '12', bucket: 'solid', name: 'Florida: 40 students', label: 'FL 40', shade: '#fcd34d', detail: 'Florida: 40 Deaf students' },
        { fips: '32', bucket: 'tint', name: 'Nevada: 1 district' },
      ],
      onSelect: () => {},
    }),
  );
  assert.match(html, /<path d="[^"]*" fill="#fcd34d" class="cuix-map-shape cuix-map-shade"/);
  assert.match(html, /<title>Florida: 40 Deaf students<\/title>/);
  assert.equal(html.match(/<title>/g)?.length, 1, 'a region without detail has no title');
  assert.match(html, /fill="url\(#[^)]+\)" class="cuix-map-shape cuix-map-tint"/);
  const swatch = renderToString(h(MapSwatch, { bucket: 'solid', shade: '#fcd34d' }));
  assert.match(swatch, /fill="#fcd34d" class="cuix-map-shade"/);
  assert.match(renderToString(h(MapSwatch, { bucket: 'solid' })), /class="cuix-map-solid"/);
  assert.match(renderToString(h(MapSwatch, {})), /class="cuix-map-none"/, 'bucket defaults to none');
  assert.match(renderToString(h(MapSwatch, { bucket: 'tint', shade: '#fcd34d' })), /fill="#fcd34d" class="cuix-map-shade"/, 'shade wins over the hatch');
  const empty = renderToString(
    h(UsMap, { level: { kind: 'us' }, label: 'x', states: [{ fips: '32', bucket: 'tint', name: 'Nevada', shade: '' }], onSelect: () => {} }),
  );
  assert.match(empty, /fill="url\(#[^)]+\)" class="cuix-map-shape cuix-map-tint"/, 'an empty shade is no shade');
});

test('a shaded solid county label stays haloed; only an unshaded solid one knocks out', () => {
  const src = readFileSync(new URL('../src/map/UsMap.tsx', import.meta.url), 'utf8');
  assert.match(src, /const solid = r\.bucket === 'solid' && !r\.shade;/);
  assert.match(src, /solid \? 'cuix-map-label cuix-map-label-solid' : 'cuix-map-label'/);
});

const VIEW = { width: 975, height: 610 };
const BOX = { x: 600, y: 300, width: 200, height: 150 };
const FIT = cameraFor(BOX, VIEW);
// The map point under a view point, for a camera.
const under = (c: { x: number; y: number; k: number }, p: { x: number; y: number }) => ({ x: (p.x - c.x) / c.k, y: (p.y - c.y) / c.k });

test('zoomAbout keeps the map point under the pointer fixed', () => {
  const p = { x: 200, y: 90 };
  let zoom = 1;
  let shift = ZERO;
  const before = under(viewCamera(FIT, zoom, shift, VIEW), p);
  for (const f of [1.5, 1.5, 0.8, 2]) {
    const r = zoomAbout(FIT, zoom, shift, f, p, VIEW);
    zoom = r.zoom;
    shift = r.shift;
    const now = under(viewCamera(FIT, zoom, shift, VIEW), p);
    assert.ok(Math.abs(now.x - before.x) < 1e-9 && Math.abs(now.y - before.y) < 1e-9, `factor ${String(f)}`);
  }
  assert.ok(Math.abs(zoom - 1.5 * 1.5 * 0.8 * 2) < 1e-9);
  // About the centre it is zoomCamera, with no shift.
  const c = { x: 487.5, y: 305 };
  const centred = zoomAbout(FIT, 1, ZERO, 3, c, VIEW);
  const cam = viewCamera(FIT, centred.zoom, centred.shift, VIEW);
  const ref = zoomCamera(FIT, 3, VIEW);
  assert.ok(Math.abs(cam.x - ref.x) < 1e-9 && Math.abs(cam.y - ref.y) < 1e-9 && cam.k === ref.k);
});

test('zoomAbout clamps the zoom to [ZOOM_MIN, ZOOM_MAX] and ignores a bad factor', () => {
  const p = { x: 10, y: 10 };
  assert.equal(zoomAbout(FIT, 6, ZERO, 100, p, VIEW).zoom, ZOOM_MAX);
  assert.equal(zoomAbout(FIT, 2, ZERO, 0.001, p, VIEW).zoom, ZOOM_MIN);
  assert.equal(zoomAbout(FIT, 2, ZERO, Number.NaN, p, VIEW).zoom, 2);
});

test('a zoom about the centre keeps the centre point whatever the pan', () => {
  const shift = panBy(ZERO, -120, 40, 3);
  const mid = { x: VIEW.width / 2, y: VIEW.height / 2 };
  const a = under(viewCamera(FIT, 3, shift, VIEW), mid);
  const b = under(viewCamera(FIT, 6, shift, VIEW), mid);
  assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
});

test('panBy moves the view by the drag, whatever the zoom', () => {
  const s = panBy(ZERO, 30, -12, 2);
  const a = viewCamera(FIT, 2, ZERO, VIEW);
  const b = viewCamera(FIT, 2, s, VIEW);
  assert.ok(Math.abs(b.x - a.x - 30) < 1e-9 && Math.abs(b.y - a.y + 12) < 1e-9);
});

test('clampShift: no pan at the fit, and the box can never leave the view', () => {
  assert.deepEqual(clampShift(FIT, 1, { x: 500, y: 500 }, BOX, VIEW), ZERO);
  for (const z of [1.5, 3, 8]) {
    for (const [dx, dy] of [[5000, 5000], [-5000, -5000], [5000, -5000]] as const) {
      const s = clampShift(FIT, z, panBy(ZERO, dx, dy, z), BOX, VIEW);
      const cam = viewCamera(FIT, z, s, VIEW);
      const r = screenRect(BOX, cam, { left: 0, top: 0, width: VIEW.width, height: VIEW.height }, VIEW);
      assert.ok(r.x + r.width > 0 && r.x < VIEW.width && r.y + r.height > 0 && r.y < VIEW.height, `z=${String(z)} ${String(dx)},${String(dy)}`);
      assert.ok(Math.min(r.x + r.width, VIEW.width) - Math.max(r.x, 0) >= 0.25 * Math.min(r.width, VIEW.width) - 1e-6, 'keeps a quarter of its width');
      assert.ok(Math.min(r.y + r.height, VIEW.height) - Math.max(r.y, 0) >= 0.25 * Math.min(r.height, VIEW.height) - 1e-6, 'keeps a quarter of its height');
    }
  }
  // A pan already inside the limit is returned as is.
  const inside = panBy(ZERO, 5, 5, 2);
  assert.equal(clampShift(FIT, 2, inside, BOX, VIEW), inside);
});

test('isDrag: a press under the threshold is a click, beyond it a drag', () => {
  assert.equal(DRAG_THRESHOLD, 4);
  assert.equal(isDrag(0, 0), false);
  assert.equal(isDrag(3, 0), false);
  assert.equal(isDrag(4, 0), false);
  assert.equal(isDrag(2.8, 2.8), false);
  assert.equal(isDrag(0, -4.1), true);
  assert.equal(isDrag(3, 3), true);
  assert.equal(isDrag(1, 1, 1), true);
});

test('wheelZoomFactor: up zooms in, down out, capped, lines and pages normalised, a pinch is more sensitive', () => {
  assert.ok(wheelZoomFactor(-100) > 1);
  assert.ok(wheelZoomFactor(100) < 1);
  assert.equal(wheelZoomFactor(0), 1);
  assert.ok(Math.abs(wheelZoomFactor(-40) * wheelZoomFactor(40) - 1) < 1e-12, 'symmetric');
  assert.equal(wheelZoomFactor(-5000), wheelZoomFactor(-WHEEL_MAX), 'a flick cannot jump');
  assert.equal(wheelZoomFactor(-3, 1), wheelZoomFactor(-48, 0), 'three lines are 48px');
  assert.equal(wheelZoomFactor(-1, 2), wheelZoomFactor(-WHEEL_MAX, 0), 'a page is capped');
  assert.ok(wheelZoomFactor(-4, 0, true) > wheelZoomFactor(-4, 0, false));
  assert.equal(wheelZoomFactor(Number.NaN), 1);
  // A trackpad's stream of small deltas adds up to the same as one big one (below the cap).
  const stream = Array.from({ length: 10 }, () => wheelZoomFactor(-5)).reduce((a, b) => a * b, 1);
  assert.ok(Math.abs(stream - wheelZoomFactor(-50)) < 1e-12);
});

test('clientToView and screenRect are inverses, with and without letterboxing', () => {
  for (const rect of [{ left: 10, top: 20, width: 487.5, height: 305 }, { left: 0, top: 0, width: 975, height: 900 }]) {
    const cam = viewCamera(FIT, 2, panBy(ZERO, 10, 10, 2), VIEW);
    const r = screenRect(BOX, cam, rect, VIEW);
    const a = clientToView(rect, VIEW, r.x, r.y);
    assert.ok(Math.abs(a.x - (cam.x + BOX.x * cam.k)) < 1e-9 && Math.abs(a.y - (cam.y + BOX.y * cam.k)) < 1e-9);
  }
});
