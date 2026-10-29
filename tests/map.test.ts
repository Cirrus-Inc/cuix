import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { albersUsa } from '../src/map/albersUsa.ts';
import { groupPoints } from '../src/map/groupPoints.ts';
import { ZOOM_MAX, ZOOM_MIN, cameraFor, clampZoom, intersects, pathBBox, shapePoints, stepZoom, visibleRect, zoomCamera } from '../src/map/mapMath.ts';
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
