# Map

`@cirrus/cuix/map` draws the US → state → county map, its points and a Layers panel; `@cirrus/cuix/map/street` is the district level on vector tiles. Promoted from HIVE (ADR-0012 §6, ADR-0014) when LuxReach became the second consumer (Cirrus-Inc/cuix#74). cuix ships the drawing, the panel and the maths; what a region or a point means is the app's.

## Install

The subpath needs only `react` and `react-dom`. It imports nothing from `@cirrus/cuix/react` or `@cirrus/cuix/theme`, so an app without cuix's theme, Tailwind or Radix uses it as is: every other peer is optional. The street level adds one peer:

```sh
npm i maplibre-gl@^6        # only for @cirrus/cuix/map/street
```

and the app imports `maplibre-gl/dist/maplibre-gl.css` itself. Under Vite, keep maplibre-gl out of dependency pre-bundling, or its worker fails to load in dev ("Worker failed to load"):

```ts
// vite.config.ts
export default defineConfig({ optimizeDeps: { exclude: ['maplibre-gl'] } });
```

## Subpaths

| Import | What |
|---|---|
| `@cirrus/cuix/map` | `UsMap`, `LayersPanel`, `MapSwatch`, `MarkerSwatch`, `albersUsa`, `groupPoints`, `cameraFor`, `pathBBox`, `visibleRect`, `intersects`, `shapePoints`, `mapColor`, `colorVars`, types |
| `@cirrus/cuix/map/geo/usStates` | `US_STATES` (51 shapes, 107 KB), `VIEWBOX` (`0 0 975 610`), `StateShape`, `CountyShape` |
| `@cirrus/cuix/map/geo/usStateIndex` | `US_STATE_INDEX`: FIPS, ISO and name, no paths |
| `@cirrus/cuix/map/geo/US-XX` | `COUNTIES` of one state (median 16 KB, Texas 53 KB) |
| `@cirrus/cuix/map/street` | `StreetMap`, `OPENFREEMAP_LIBERTY` |

`UsMap` imports `usStates` (the US level needs every state) and loads a state's county file only when that state is shown, through one literal `import()` per state, so any bundler emits one chunk per state and the US level downloads none. Pass `loadCounties` to load them some other way. Geometry is generated, never edited: `scripts/gen-us-map.mjs` (command in its header) from us-atlas 3.0.1, US Census 2017, pre-projected Albers 975×610. `tests/map-geo.test.ts` holds 51 states, the FIPS prefix of every county, 3142 counties and the size budgets (120 KB for `usStates`, 60 KB per state file).

## UsMap

```tsx
<UsMap
  level={iso ? { kind: 'state', iso } : { kind: 'us' }}
  label="Districts by state"
  states={[{ fips: '12', bucket: 'solid', name: 'Florida: 12 districts', label: 'FL 12', href: '/districts/US-FL' }]}
  counties={countyRegions}
  onSelect={(kind, id) => (kind === 'state' ? openState(id) : selectCounty(id))}
  focus={selectedCounty}
  points={groupPoints(interpreters, { name: (m) => `${m.length} interpreters` })}
  onSelectPoint={openSheet}
  onBack={zoomOut}
/>
```

- **Regions** come in three buckets, never colour alone: `none` is an outline, `tint` is hatched, `solid` is filled. A state with `href` is a link (open in new tab works); without one it is a button. Tab order is alphabetical by `name`; at county focus, off-screen counties and points leave the tab order but stay clickable.
- **Points** are drawn at the state level, at one size on screen whatever the zoom. `shape` (circle, square, triangle, diamond, cross) carries the category and its default colour (`chart-1`…`chart-4`, `foreground-muted`) repeats it; `color` overrides. A point with `count > 1` is a number badge. `groupPoints(items, { cell })` projects `{ id, name, lat, lng }` items and merges those in one grid cell (default 0.1 units, i.e. the same spot; `8 / k` clusters by screen density).
- **Tooltip.** Built in: shown on hover and focus, hoverable, Esc hides it; its content is the point's `detail` after the name, or `renderTooltip(point)`. To use the app's own tooltip, `wrapPoint={(p, marker) => <Tooltip content={…}>{marker}</Tooltip>}`; the built-in one is then off.
- **Focus** is a non-scaling overlay ring (surface band under a `focus-ring` line), not an outline: an outline inside the zoomed group would scale with the camera.
- **Target size.** Counties and points are drawn at their geographic size, so many are under cuix's 44px floor (a point is 10px, a badge 22px, at a 975px-wide map). The map relies on the 2.5.5 *equivalent* exception: the app must offer every county and point as a 44px control elsewhere on the page (the list beside the map in HIVE and LuxReach). A map without that list does not meet 2.5.5.
- **Camera.** `level` fits the state, `focus` (a county FIPS) fits that county with its neighbours. `onBack` makes a single click outside any control step back a level (mouse only; the keyboard uses the app's breadcrumb and Esc). `prefers-reduced-motion` turns the transition off.

## LayersPanel

```tsx
<LayersPanel
  layers={[
    { id: 'schools', label: 'Schools', count: 128, shape: 'square' },
    { id: 'interpreters', label: 'Interpreters', count: 34 },
    { id: 'deaf', label: 'Deaf students', disabled: true, hint: 'Later' },
  ]}
  value={on}
  onChange={(id, next) => setOn({ ...on, [id]: next })}
/>
```

One `role="switch"` per layer; the row is the 44px target and its text (label, hint, count) the accessible name. Controlled: the app owns `value` and stores it if it wants to. A `disabled` layer is `aria-disabled` and stays focusable, so its hint is found. The same `MapLayer` objects style `StreetMap`'s pins.

## StreetMap

```tsx
<StreetMap
  label="Duval County Public Schools"
  bounds={[[-82.05, 30.1], [-81.3, 30.6]]}
  pins={pins.filter((p) => on[p.layer])}
  layers={layers}
  onSelectPin={(pin) => select(pin.id)}
  renderPopup={(pin) => <PinCard id={pin.id} />}
  style={{ height: 480 }}
/>
```

`maplibre-gl` is imported inside an effect, so `@cirrus/cuix/map` never loads it and SSR renders an empty, named region. Camera: `bounds`, else `center` + `zoom`, else the pins' extent. `styleUrl` defaults to OpenFreeMap Liberty (keyless); point it at self-hosted tiles when needed. The attribution control is always on (the tiles' licence requires it). Pins are 44px buttons (`--cuix-target-min`, 2.5.5) around a 16px marker, named by `label`, in label order (kept when pins are added later); `renderPopup` renders into a MapLibre popup through a portal, so it keeps the app's context.

## Colours

Every colour is a CSS custom property: `--cuix-map-<token>`, then the cuix token (`--cuix-surface`, `--cuix-accent`…), then the core day value. In a cuix app the map follows the theme with no setup. Elsewhere, set the `--cuix-map-*` properties on an ancestor or pass `colors={{ accent: 'var(--app-accent)', surface: '#fff' }}`. Tokens used: `surface`, `border`, `border-strong`, `foreground`, `foreground-muted`, `accent`, `accent-soft`, `focus-ring`, `danger`, `chart-1`…`chart-4`. US-level labels size with `--cuix-map-label-size`.

The styles are one `<style>` element React 19 hoists to `<head>` once. Under a CSP without `'unsafe-inline'` in `style-src`, allow the SHA-256 of that element's text (it changes with each release). A nonce cannot be passed yet. Server-rendered markup also carries `style` attributes (camera, colours, tooltip position), which such a CSP blocks too; rendered on the client they are set through the CSSOM and pass.

## Not included

Free pan and zoom on the SVG levels, a phone layout, clustering at the street level.
