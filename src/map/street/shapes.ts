import type { AddLayerObject } from 'maplibre-gl';
import { mapColor, isMapColor } from '../colors.ts';

// Polygons and lines under the pins: one GeoJSON source, a fill layer (polygons) and a line layer,
// styled per feature so one pair of layers serves every shape. Pure functions over a minimal map
// interface, so the lifecycle is tested without MapLibre.

export interface StreetShape {
  id: string;
  /** Rings of [lng, lat]; the first is the outer ring. A `line` has one ring and is not closed. */
  coordinates: readonly (readonly [number, number][])[];
  /** Default `polygon`. */
  kind?: 'polygon' | 'line' | undefined;
  /** A `MapColors` key or a CSS colour; default the focus ring colour. */
  color?: string | undefined;
  /** Fill opacity of a polygon; default 0.08. */
  fillOpacity?: number | undefined;
  /** Line width in px; default 2. */
  lineWidth?: number | undefined;
}

export const SHAPES_SOURCE = 'cuix-street-shapes';
export const SHAPES_FILL = `${SHAPES_SOURCE}-fill`;
export const SHAPES_LINE = `${SHAPES_SOURCE}-line`;
export const DEFAULT_FILL_OPACITY = 0.08;
export const DEFAULT_LINE_WIDTH = 2;

export interface ShapeFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: [number, number][][] } | { type: 'LineString'; coordinates: [number, number][] };
  properties: { id: string; color: string; fillOpacity: number; lineWidth: number };
}

export interface ShapeCollection {
  type: 'FeatureCollection';
  features: ShapeFeature[];
}

const closed = (ring: readonly [number, number][]): [number, number][] => {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first && last && (first[0] !== last[0] || first[1] !== last[1]) ? [...ring, first] : [...ring];
};

/**
 * The shapes as GeoJSON. `resolve` turns a CSS colour (it may be a `var()`) into one MapLibre can
 * parse. A polygon ring is closed if it is not, as GeoJSON requires; a shape too short to draw
 * (a line under 2 points, a ring under 3) is dropped.
 */
export function shapeFeatures(shapes: readonly StreetShape[], resolve: (css: string) => string): ShapeCollection {
  const features: ShapeFeature[] = [];
  for (const s of shapes) {
    const css = s.color === undefined ? mapColor('focusRing') : isMapColor(s.color) ? mapColor(s.color) : s.color;
    const properties = { id: s.id, color: resolve(css), fillOpacity: s.fillOpacity ?? DEFAULT_FILL_OPACITY, lineWidth: s.lineWidth ?? DEFAULT_LINE_WIDTH };
    if (s.kind === 'line') {
      const line = s.coordinates[0];
      if (line && line.length >= 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [...line] }, properties });
      continue;
    }
    const rings = s.coordinates.filter((r) => r.length >= 3).map(closed);
    if (rings.length > 0 && rings.length === s.coordinates.length) features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties });
  }
  return { type: 'FeatureCollection', features };
}

/** What the shape lifecycle needs from a MapLibre map. */
export interface ShapesMap {
  getSource(id: string): unknown;
  getLayer(id: string): unknown;
  addSource(id: string, source: { type: 'geojson'; data: ShapeCollection }): unknown;
  addLayer(layer: AddLayerObject, beforeId?: string): unknown;
  removeLayer(id: string): unknown;
  removeSource(id: string): unknown;
}

/** Adds the source and both layers once, under `beforeId` (the pin layer) when that layer exists. */
export function installShapes(map: ShapesMap, data: ShapeCollection, beforeId: string): void {
  if (map.getSource(SHAPES_SOURCE)) return;
  const before = map.getLayer(beforeId) ? beforeId : undefined;
  map.addSource(SHAPES_SOURCE, { type: 'geojson', data });
  map.addLayer(
    {
      id: SHAPES_FILL,
      type: 'fill',
      source: SHAPES_SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fillOpacity'] },
    },
    before,
  );
  map.addLayer(
    {
      id: SHAPES_LINE,
      type: 'line',
      source: SHAPES_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'lineWidth'] },
    },
    before,
  );
}

export function removeShapes(map: ShapesMap): void {
  if (map.getLayer(SHAPES_LINE)) map.removeLayer(SHAPES_LINE);
  if (map.getLayer(SHAPES_FILL)) map.removeLayer(SHAPES_FILL);
  if (map.getSource(SHAPES_SOURCE)) map.removeSource(SHAPES_SOURCE);
}

/** `setData` on the live source, if it is there. */
export function updateShapes(map: Pick<ShapesMap, 'getSource'>, data: ShapeCollection): void {
  const source = map.getSource(SHAPES_SOURCE) as { setData(d: ShapeCollection): unknown } | undefined;
  if (source) void source.setData(data);
}

/** The computed colour of a CSS colour in `host`'s context, so `var(--cuix-map-*)` resolves through the theme. */
export function resolveColor(host: HTMLElement, css: string): string {
  const probe = host.ownerDocument.createElement('span');
  probe.style.color = css;
  probe.style.display = 'none';
  host.appendChild(probe);
  const out = getComputedStyle(probe).color;
  probe.remove();
  return out || css;
}
