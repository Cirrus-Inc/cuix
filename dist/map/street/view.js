export const MOVE_END_DEBOUNCE_MS = 200;
/** A longitude in [-180, 180]. */
export const wrapLng = (lng) => (lng >= -180 && lng <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180);
/**
 * The bbox of a view with its longitudes wrapped into [-180, 180]. A view a full turn wide or
 * more is [-180, s, 180, n]; a view across the antimeridian has west > east (RFC 7946 §5.2).
 */
export function wrapBBox(west, south, east, north) {
    if (east - west >= 360)
        return [-180, south, 180, north];
    return [wrapLng(west), south, wrapLng(east), north];
}
/**
 * Calls `cb` with the settled view `ms` after the last `moveend`, and once after
 * subscribing: at once when the camera is still, else after the move in flight
 * (the initial fit) ends. A `movestart` cancels a pending call, so a gesture begun
 * within `ms` is never reported mid-move. Returns the unsubscribe.
 */
export function watchView(map, cb, ms = MOVE_END_DEBOUNCE_MS) {
    let timer;
    const fire = () => {
        const b = map.getBounds();
        cb({ bbox: wrapBBox(b.getWest(), b.getSouth(), b.getEast(), b.getNorth()), zoom: map.getZoom() });
    };
    const cancel = () => clearTimeout(timer);
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(fire, ms);
    };
    map.on('movestart', cancel);
    map.on('moveend', schedule);
    if (!map.isMoving())
        schedule();
    return () => {
        clearTimeout(timer);
        map.off('movestart', cancel);
        map.off('moveend', schedule);
    };
}
/**
 * What the camera follows, as a key that changes only when it must move: `bounds`, else
 * `center` + `zoom`, else the pins' extent, but only the first non-empty set of pins. Later
 * pins never move the camera, so pins fetched for the view in `onMoveEnd` cannot refit it.
 * `prev` is the key of the previous render.
 */
export function cameraKey(prev, bounds, center, zoom, hasPins) {
    if (bounds)
        return `b:${JSON.stringify(bounds)}`;
    if (center)
        return `c:${JSON.stringify([center.lng, center.lat, zoom])}`;
    if (hasPins || prev === 'pins')
        return 'pins';
    return null;
}
/** A pin's stacking rank: its layer's index in `layers`, so the last layer is on top. -1 for an unknown layer. */
export function layerRanks(layers) {
    return new Map(layers.map((l, i) => [l.id, i]));
}
/**
 * Stacking, for `n` layers, bottom to top:
 * - `pinZ(rank)`, 0..n: a pin that clusters (or any pin when clustering is off), by layer rank;
 * - `bubbleZ(n)`, n + 1: every cluster bubble;
 * - `unclusteredPinZ(rank, n)`, n + 2..2n + 2: a pin of a layer outside `cluster.layers`, by layer rank,
 *   so a sparse layer that never clusters is never under a bubble or a clustered pin;
 * - `tipZ(n)`, 2n + 3: the spot showing its tooltip.
 */
export const pinZ = (rank) => (rank ?? -1) + 1;
export const bubbleZ = (n) => n + 1;
export const unclusteredPinZ = (rank, n) => n + 2 + pinZ(rank);
export const tipZ = (n) => 2 * n + 3;
/** The layer ids that cluster: `cluster.layers` as a set, or null when every layer clusters. */
export const clusteredSet = (ids) => (ids ? new Set(ids) : null);
/** Whether a pin of `layer` goes into the clustered source. */
export const clusters = (only, layer) => !only || only.has(layer);
/** Splits pins into those that cluster and those always drawn as markers. */
export function splitPins(pins, only) {
    if (!only)
        return { clustered: [...pins], free: [] };
    const clustered = [];
    const free = [];
    for (const p of pins)
        (only.has(p.layer) ? clustered : free).push(p);
    return { clustered, free };
}
/**
 * Per-cluster aggregates MapLibre computes: `top` is the highest layer rank among the members, `n<i>` the members of layer i.
 * Only the layers that cluster get a count.
 */
export function clusterProperties(layers, only = null) {
    const props = { top: ['max', ['get', 'z']] };
    layers.forEach((l, i) => {
        if (clusters(only, l.id))
            props[`n${String(i)}`] = ['+', ['case', ['==', ['get', 'z'], i], 1, 0]];
    });
    return props;
}
/** Reads `clusterProperties`' aggregates back from a cluster feature's properties; a layer outside `only` is never counted nor the bubble's colour. */
export function clusterSummary(layers, props, only = null) {
    const top = typeof props.top === 'number' ? props.top : -1;
    const counts = [];
    for (let i = layers.length - 1; i >= 0; i--) {
        if (!clusters(only, layers[i].id))
            continue;
        const n = props[`n${String(i)}`];
        if (typeof n === 'number' && n > 0)
            counts.push([layers[i].id, n]);
    }
    const layer = layers[top];
    return { layer: layer && clusters(only, layer.id) ? layer : undefined, layers: counts };
}
/** The default accessible name of a cluster bubble, e.g. "12 pins: Customers 3, Schools 9". */
export function clusterName(count, summary, layers) {
    const label = new Map(layers.map((l) => [l.id, l.label]));
    const parts = summary.layers.map(([id, n]) => `${label.get(id) ?? id} ${String(n)}`);
    return `${String(count)} pins${parts.length ? `: ${parts.join(', ')}` : ''}`;
}
/** What a pin shows on hover and focus: `tooltip(pin)`, else its label. */
export function tipFor(pin, tooltip) {
    return tooltip ? tooltip(pin) : pin.label;
}
/**
 * The pins and bubbles in view among a clustered source's features: features repeat across tiles and
 * tiles reach past the viewport, so they are deduped and kept only when `inView`. Bubbles north to south.
 */
export function clusterHits(features, inView) {
    const pins = new Set();
    const clusters = new Map();
    for (const f of features) {
        if (f.geometry.type !== 'Point')
            continue;
        const [lng, lat] = f.geometry.coordinates;
        if (!inView([lng, lat]))
            continue;
        const p = (f.properties ?? {});
        if (p.cluster === true && typeof p.cluster_id === 'number') {
            if (clusters.has(p.cluster_id))
                continue;
            const count = Number(p.point_count);
            clusters.set(p.cluster_id, { id: p.cluster_id, lng, lat, count, text: String(p.point_count_abbreviated ?? count), props: p });
        }
        else if (typeof p.id === 'string')
            pins.add(p.id);
    }
    return { pins, clusters: [...clusters.values()].sort((a, b) => b.lat - a.lat || a.lng - b.lng) };
}
/**
 * Calls `refresh` when the camera stops, when `source`'s data loads, and on `idle`. The `idle` pass is
 * the one that settles the bubbles: while a zoom's tiles load, MapLibre keeps the loaded parent tiles
 * as cover and `querySourceFeatures` returns their bubbles next to the children's. The last tile's
 * `sourcedata` still sees the parents; they are dropped on the next frame, which fires no `sourcedata`,
 * and `idle` comes once every tile is loaded and rendered (Cirrus-Inc/cuix#85). Returns the unsubscribe.
 */
export function watchClusters(map, source, refresh) {
    const onData = (e) => {
        if (e.sourceId === source && map.isSourceLoaded(source))
            refresh();
    };
    map.on('moveend', refresh);
    map.on('sourcedata', onData);
    map.on('idle', refresh);
    return () => {
        map.off('moveend', refresh);
        map.off('sourcedata', onData);
        map.off('idle', refresh);
    };
}
