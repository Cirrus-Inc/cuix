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
/** The CSS z-index of a pin's marker: above the map's own markers at 0, the last layer highest. */
export const pinZ = (rank) => (rank ?? -1) + 1;
/** Per-cluster aggregates MapLibre computes: `top` is the highest layer rank among the members, `n<i>` the members of layer i. */
export function clusterProperties(layers) {
    const props = { top: ['max', ['get', 'z']] };
    layers.forEach((_, i) => {
        props[`n${String(i)}`] = ['+', ['case', ['==', ['get', 'z'], i], 1, 0]];
    });
    return props;
}
/** Reads `clusterProperties`' aggregates back from a cluster feature's properties. */
export function clusterSummary(layers, props) {
    const top = typeof props.top === 'number' ? props.top : -1;
    const counts = [];
    for (let i = layers.length - 1; i >= 0; i--) {
        const n = props[`n${String(i)}`];
        if (typeof n === 'number' && n > 0)
            counts.push([layers[i].id, n]);
    }
    return { layer: layers[top], layers: counts };
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
