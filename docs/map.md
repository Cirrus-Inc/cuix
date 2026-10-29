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

A production build needs one more step: Vite does not bundle MapLibre's worker on its own, so the built app shows a blank map and logs "Worker failed to load" while dev works. Hand the worker's URL to MapLibre through `loadMapLibre`:

```tsx
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

const loadMapLibre = () =>
  import('maplibre-gl').then((ml) => {
    ml.setWorkerUrl(workerUrl);
    return ml;
  });

<StreetMap loadMapLibre={loadMapLibre} … />
```

## Subpaths

| Import | What |
|---|---|
| `@cirrus/cuix/map` | `UsMap`, `LayersPanel`, `MapSwatch`, `MarkerSwatch`, `albersUsa`, `groupPoints`, `cameraFor`, `zoomCamera`, `viewCamera`, `zoomAbout`, `panBy`, `clampShift`, `clampZoom`, `stepZoom`, `isDrag`, `wheelZoomFactor`, `clientToView`, `screenRect`, `ZOOM_MIN` / `ZOOM_MAX` / `ZOOM_STEP`, `DRAG_THRESHOLD`, `WHEEL_MAX`, `KEEP`, `ZERO`, `pathBBox`, `visibleRect`, `intersects`, `shapePoints`, `mapColor`, `colorVars`, types |
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
- **`shade` and `detail` on a region.** `shade` is any CSS colour drawn as the fill in place of the bucket's fill or hatch (a count layer); the bucket's outline stays, so colour is never the only encoding, and the label stays haloed even when `bucket` is `solid` (only a solid region without `shade` knocks the label out). `MapSwatch({ bucket, shade })` draws the same in a legend (`bucket` defaults to `none`; `shade` wins over any bucket's fill). An empty `shade` counts as none. `detail` is a tooltip (`<title>` on the region, state and county level) for text that says more than `name`.
- **Points** are drawn at the state level, at one size on screen whatever the zoom. `shape` (circle, square, triangle, diamond, cross) carries the category and its default colour (`chart-1`…`chart-4`, `foreground-muted`) repeats it; `color` overrides. A point with `count > 1` is a number badge. `groupPoints(items, { cell })` projects `{ id, name, lat, lng }` items and merges those in one grid cell (default 0.1 units, i.e. the same spot; `8 / k` clusters by screen density).
- **Tooltip.** Built in: shown on hover and focus, hoverable, Esc hides it; its content is the point's `detail` after the name, or `renderTooltip(point)`. To use the app's own tooltip, `wrapPoint={(p, marker) => <Tooltip content={…}>{marker}</Tooltip>}`; the built-in one is then off.
- **Focus** is a non-scaling overlay ring (surface band under a `focus-ring` line), not an outline: an outline inside the zoomed group would scale with the camera.
- **Target size.** Counties and points are drawn at their geographic size, so many are under cuix's 44px floor (a point is 10px, a badge 22px, at a 975px-wide map). The map relies on the 2.5.5 *equivalent* exception: the app must offer every county and point as a 44px control elsewhere on the page (the list beside the map in HIVE and LuxReach). A map without that list does not meet 2.5.5.
- **Camera.** `level` fits the state, `focus` (a county FIPS) fits that county with its neighbours. `onBack` makes a single click outside any control step back a level (mouse only; the keyboard uses the app's breadcrumb and Esc). `prefers-reduced-motion` turns the transition off.
- **Zoom** (state level only; the US level has none). A factor over the fit camera, 1 (the fit) to 8 (`ZOOM_MAX`); with `focus` set it zooms into that county's fit. Built in: a `+` / `−` / Fit group in the map's top-right corner, 44px native buttons placed before the map in the tab order, named by `zoomLabels` (default `Zoom`, `Zoom in`, `Zoom out`, `Fit`; `fit` is also the visible text). Each press steps by 1.5 (`ZOOM_STEP`) about the centre of the view; at a clamp the button is `aria-disabled` and keeps focus, so pressing on does nothing rather than dropping focus to the page. `zoomControls={false}` hides the group for an app that places its own. `zoom` + `onZoomChange(zoom)` make it controlled, e.g. from the app's toolbar (`stepZoom(zoom, 1)` and `clampZoom` give the same steps and bounds); a controlled factor survives a change of state or `focus`, so set it back to 1 when you change `level` or `focus`, or the new fit opens zoomed in. Uncontrolled, the map keeps its own factor and returns to 1 whenever the fit changes (another state, another `focus`). `onZoomChange` reports every change, from a button, the wheel, a double-click, a pinch or a key. Zoomed in, the counties and points outside the view leave the tab order but stay clickable, as at county focus.
- **Gestures** (state level only, on by default; `gestures={false}` turns them all off, leaving the buttons and the controlled `zoom`). They work with a controlled `zoom` and with `zoomControls={false}` too: the app's own toolbar and the gestures share one zoom.

  | Input | Effect |
  |---|---|
  | Wheel or trackpad scroll over the map | Zoom about the pointer. One event zooms at most about 22% (a flick cannot jump); a trackpad's stream of small deltas adds up smoothly |
  | Trackpad pinch (Mac: a ctrl wheel) | Zoom about the pointer, more sensitive than a plain wheel; counts as the modifier below |
  | Double-click | Zoom in one step (`ZOOM_STEP`) about the click point |
  | Press and drag | Pan, with a `grab` / `grabbing` cursor. Pointer Events with pointer capture |
  | Touch: one finger / two fingers | Pan / pinch about the midpoint of the fingers; at the fit the svg has `touch-action: pan-y` (a one-finger vertical swipe still scrolls the page; a pinch reaches the map), zoomed in `touch-action: none` |
  | Arrows, with the map itself focused | Pan by 20% of the view (nothing at the fit, so the page still scrolls) |
  | `+` or `=` / `-` or `_`, with the map itself focused | Zoom in / out one step about the centre |

  - **The wheel and the page.** The wheel listener is native and non-passive and calls `preventDefault` only while the pointer is over the map, so the page scrolls everywhere else. With the default `wheelZoom="plain"` the page also stops scrolling under the pointer, as on Google's full map; a tall page with a map in the middle should pass `wheelZoom="modifier"`, which zooms only with ctrl or cmd held (a pinch always zooms) and leaves a plain wheel to the page, as embedded Google Maps does.
  - **Drag is not a click.** A press that moves more than 4px (`DRAG_THRESHOLD`) is a drag: its release fires no `onSelect`, `onSelectPoint` or `onBack`. A press under 4px is a click as before; pointer capture starts only once the drag does, so a plain click keeps its target. Hover is off while dragging (`onHover` is not called, no tooltip, no hover stroke).
  - **Double-click.** The first click of a double-click selects (`onSelect` / `onSelectPoint`); the second (`event.detail > 1`) does not, so a consumer that toggles its selection on `onSelect` is not toggled back. With gestures on, `onBack` waits 250ms after a click on empty map so that a double-click there zooms instead of stepping back; a double-click cancels it.
  - **Pan limits.** The pan is the map's own state (not controlled), in units of the fit, so it survives a zoom from outside and resets to none with the fit (another state or `focus`) and whenever the zoom is 1: there is no pan at the fit, and Fit clears it. The state's outline keeps at least a quarter of its smaller side in view on both axes (`KEEP`, `clampShift`), at any zoom, including when `focus` has the camera on a county.
  - **Keyboard design.** The map's svg is one tab stop, after the zoom buttons and before the counties. Its keys act only when the svg itself is the target of the event (`event.target === event.currentTarget`), so a focused county or marker keeps every key it has now, and today's Enter/Space activation is unchanged. Ctrl/cmd/alt combinations (browser zoom) are left alone. Arrows are consumed only while zoomed in.
  - **Selected bounds.** `onSelectedBounds(rect: DOMRect | null)` gives the `selected` county's shape on screen in client px (what `getBoundingClientRect` would say of its ring, without the stroke), or `null` when nothing is selected, the FIPS is unknown or the shapes have not loaded. It is computed from the camera the map is heading to, so it is not mid-transition, and it fires after every camera change (button, gesture, `focus`, `zoom`), a resize of the map and a page scroll, but only when the rectangle changed. Place an overlay from it instead of querying `.cuix-map-ring-line`.
  - **Not covered.** Touch and real trackpad pinch are unit-tested as maths and by synthetic events only; a browser's own pinch-zoom of the page is untouched. The US level has no gestures (a click there picks a state; there is no zoom).
- **County outline.** `countyOutline="bold"` draws the state's county borders at 2px in `border-strong`, a clear grid instead of hairlines (default `hairline`). It is separate from `highlight`, which stays its own path on top (3px over a bold grid, so it still stands out); a hovered county goes to 3px as well. `selected` is the other outline: a county kept drawn with the focus ring's look (band + 2px `focusRing` line at every zoom, state level), above the fills and labels and below the transient focus ring and the points. The state's own outline is unchanged.
- **Pin mode** (`onMapClick`, state level only). While set, a single left click anywhere on the map (a county, the water, a marker) calls `onMapClick({ x, y })` with the point in the 975×610 map space and fires nothing else: no `onSelect`, `onSelectPoint` or `onBack`. The zoom controls sit outside the svg and are unaffected. Hover and the gestures keep working; a drag swallows its own click, and with gestures on the click waits 250ms (like `onBack`) so a double-click only zooms. The svg gets `cuix-map-pin` (crosshair cursor) and loses `cuix-map-zoomout`. The point is in map space whatever the zoom and pan (the camera is inverted), so it is where an `overlay` shape or a marker at those coordinates lands. Enter or Space on a focused county reports the centre of its bounding box, on a marker its own point, and selects nothing either. `albersUsaInvert(x, y)` turns the point into `[lng, lat]`.
- **Overlay** (`overlay`, state level only). A `ReactNode` drawn inside the camera, in map space, above the county fills, outlines and labels and below the markers, wrapped in `<g aria-hidden pointer-events="none">`: it scales and pans with the map, and cannot take a click. Shapes in it are sized in map units; give strokes `vector-effect="non-scaling-stroke"` (the map's own do). cuix draws nothing for it: an app that wants a radius circle projects its own points with `albersUsa`.
- **`albersUsaInvert(x, y): [lng, lat] | null`.** The inverse of `albersUsa`, a port of d3-geo's `albersUsa().invert` at the same scale and translate: Alaska or Hawaii when the point is in their inset boxes, otherwise the lower 48. `null` when the point is outside the piece it falls in or the conic inverse is undefined. Round-trips with `albersUsa` within 1e-6 degrees.

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
  pins={visible} // useMemo(() => pins.filter((p) => on[p.layer]), [pins, on])
  layers={layers}
  onSelectPin={(pin) => select(pin.id)}
  renderPopup={(pin) => <PinCard id={pin.id} />}
  tooltip={(pin) => pin.label}
  cluster={{ radius: 50, maxZoom: 14, layers: ['school'] }}
  onMoveEnd={({ bbox, zoom }) => fetchPins(bbox, zoom)}
  style={{ height: 480 }}
/>
```

`maplibre-gl` is imported inside an effect, so `@cirrus/cuix/map` never loads it and SSR renders an empty, named region. Camera: `bounds`, else `center` + `zoom`, else the extent of the first non-empty `pins`. The camera moves again only when `bounds` or `center`/`zoom` change (compared by value, so a new array with the same numbers does not move it); a later `pins` never moves it. `styleUrl` defaults to OpenFreeMap Liberty (keyless); point it at self-hosted tiles when needed. The attribution control is always on (the tiles' licence requires it). Pins are 44px buttons (`--cuix-target-min`, 2.5.5) around a 16px marker, named by `label`, in label order (kept when pins are added later); `renderPopup` renders into a MapLibre popup through a portal, so it keeps the app's context.

- **Layer order is stacking order.** `layers` is drawn in array order, the last layer on top: with `['school', 'customer']` a customer pin is never under a school pin. It is a z-index per layer, not DOM order, so the tab order stays by label. **Behaviour change:** before this, `layers` order only set shapes and colours. A consumer that lists its most important layer first (a legend order such as `['customer', 'school']`) now gets it drawn at the bottom, and a mixed bubble takes the other layer's colour: reverse the array for the map (`[...layers].reverse()`) and keep the legend order where it is shown.
- **`onMoveEnd(view)`** gets `{ bbox: [west, south, east, north], zoom }` 200 ms after the camera stops (a burst of moves is one call), and once after mount with the initial view; when the camera opens on a fit, after the fit. A move that starts within the 200 ms cancels the pending call, so nothing is reported mid-gesture. Fetch by viewport from it; there is no separate first-load path, and the pins fetched there never refit the camera (see Camera above). Longitudes are wrapped into [-180, 180]: a view a full turn wide or more is `[-180, s, 180, n]`, and a view across the antimeridian has `west > east` (RFC 7946 §5.2), so split it in two before querying an API that requires `min ≤ max`.
- **`cluster`** (off by default) groups pins with MapLibre's GeoJSON clustering, which runs in its worker: `radius` in px (default 50) and `maxZoom`, the last zoom that clusters (default 14). Only the bubbles and pins in view are DOM controls, so ~5,000 pins in one viewport stay responsive. A new `pins` array re-sends every pin to the worker, so memoise it rather than filtering inline on each render. `cluster` itself can be an inline object: only `radius` and `maxZoom` are compared, and `label` is called at render, so a new function each render costs nothing. A bubble shows the count with a ring in the colour, and a corner marker in the shape, of the top-most layer present among its members: one customer among 90 schools gives a customer bubble. Its accessible name lists the members per layer, top layer first ("91 pins: Customers 1, Schools 90"); `cluster.label(c)` replaces it. A click zooms in until the bubble splits (focus moves to the map, from where Tab reaches the new pins); `onSelectCluster(c)` replaces that, with `c` = `{ id, lat, lng, count, layer, layers }`. Bubbles follow the pins in the tab order, north to south. Pins off screen are not in the tab order while clustering is on.
- **`cluster.layers`** (optional) names the layer ids that cluster; omitted, every layer does. A pin of any other layer never enters a bubble: it is always its own marker while in view (off-screen ones are not in the DOM, as with clustered pins), so a sparse layer such as interpreters stays visible among hundreds of clustered schools. Every in-view pin of such a layer is a DOM marker, so leave a dense layer clustered. `[]` clusters nothing (every pin is its own marker); an id that is not in `layers` is ignored. A bubble's colour, shape, counts, default name and `c.layers` / `c.layer` cover the clustered layers only. Stacking with clustering on, bottom to top: clustered pins by layer rank, then every bubble, then the unclustered pins by layer rank, then the spot showing its tooltip. An unclustered pin is therefore above every bubble and every clustered pin, whatever its rank; among unclustered pins the last layer is on top. Compared by value, so an inline array is fine.
- **`tooltip(pin)`** is shown on hover and on keyboard focus, never on a click (the popup opens there), stays while the pointer moves onto it and hides on Esc, wherever focus is (1.4.13). Without the prop it shows the pin's `label`; that copy is `aria-hidden`, since it is already the name. A custom tooltip is the button's `aria-describedby` while shown. A bubble's tooltip is its name.

## Colours

Every colour is a CSS custom property: `--cuix-map-<token>`, then the cuix token (`--cuix-surface`, `--cuix-accent`…), then the core day value. In a cuix app the map follows the theme with no setup. Elsewhere, set the `--cuix-map-*` properties on an ancestor or pass `colors={{ accent: 'var(--app-accent)', surface: '#fff' }}`. Tokens used: `surface`, `border`, `border-strong`, `foreground`, `foreground-muted`, `accent`, `accent-soft`, `focus-ring`, `danger`, `chart-1`…`chart-4`. US-level labels size with `--cuix-map-label-size`.

The styles are one `<style>` element React 19 hoists to `<head>` once. Under a CSP without `'unsafe-inline'` in `style-src`, allow the SHA-256 of that element's text (it changes with each release). A nonce cannot be passed yet. Server-rendered markup also carries `style` attributes (camera, colours, tooltip position), which such a CSP blocks too; rendered on the client they are set through the CSSOM and pass.

## Not included

Pan and gestures at the US level, a controlled pan (the pan is the map's own), a phone layout, the members of a street-level cluster (read them from your own data with the bubble's position).
