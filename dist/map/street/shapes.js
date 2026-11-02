import { mapColor, isMapColor } from "../colors.js";
export const SHAPES_SOURCE = 'cuix-street-shapes';
export const SHAPES_FILL = `${SHAPES_SOURCE}-fill`;
export const SHAPES_LINE = `${SHAPES_SOURCE}-line`;
export const DEFAULT_FILL_OPACITY = 0.08;
export const DEFAULT_LINE_WIDTH = 2;
const closed = (ring) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first && last && (first[0] !== last[0] || first[1] !== last[1]) ? [...ring, first] : [...ring];
};
/**
 * The shapes as GeoJSON. `resolve` turns a CSS colour (it may be a `var()`) into one MapLibre can
 * parse. A polygon ring is closed if it is not, as GeoJSON requires; a shape too short to draw
 * (a line under 2 points, a ring under 3) is dropped.
 */
export function shapeFeatures(shapes, resolve) {
    const features = [];
    for (const s of shapes) {
        const css = s.color === undefined ? mapColor('focusRing') : isMapColor(s.color) ? mapColor(s.color) : s.color;
        const properties = { id: s.id, color: resolve(css), fillOpacity: s.fillOpacity ?? DEFAULT_FILL_OPACITY, lineWidth: s.lineWidth ?? DEFAULT_LINE_WIDTH };
        if (s.kind === 'line') {
            const line = s.coordinates[0];
            if (line && line.length >= 2)
                features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [...line] }, properties });
            continue;
        }
        const rings = s.coordinates.filter((r) => r.length >= 3).map(closed);
        if (rings.length > 0 && rings.length === s.coordinates.length)
            features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties });
    }
    return { type: 'FeatureCollection', features };
}
/** Adds the source and both layers once, under `beforeId` (the pin layer) when that layer exists. */
export function installShapes(map, data, beforeId) {
    if (map.getSource(SHAPES_SOURCE))
        return;
    const before = map.getLayer(beforeId) ? beforeId : undefined;
    map.addSource(SHAPES_SOURCE, { type: 'geojson', data });
    map.addLayer({
        id: SHAPES_FILL,
        type: 'fill',
        source: SHAPES_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fillOpacity'] },
    }, before);
    map.addLayer({
        id: SHAPES_LINE,
        type: 'line',
        source: SHAPES_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'lineWidth'] },
    }, before);
}
export function removeShapes(map) {
    if (map.getLayer(SHAPES_LINE))
        map.removeLayer(SHAPES_LINE);
    if (map.getLayer(SHAPES_FILL))
        map.removeLayer(SHAPES_FILL);
    if (map.getSource(SHAPES_SOURCE))
        map.removeSource(SHAPES_SOURCE);
}
/** `setData` on the live source, if it is there. */
export function updateShapes(map, data) {
    const source = map.getSource(SHAPES_SOURCE);
    if (source)
        void source.setData(data);
}
/** The computed colour of a CSS colour in `host`'s context, so `var(--cuix-map-*)` resolves through the theme. */
export function resolveColor(host, css) {
    const probe = host.ownerDocument.createElement('span');
    probe.style.color = css;
    probe.style.display = 'none';
    host.appendChild(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out || css;
}
