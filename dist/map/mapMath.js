// Pure geometry helpers for UsMap. No DOM.
export const IDENTITY = { x: 0, y: 0, k: 1 };
// The generated paths hold only absolute M/L/Z commands (geoPath(null).digits(1)),
// so every number pair is a point.
export function pathBBox(d) {
    const n = d.match(/-?\d+(?:\.\d+)?/g);
    if (!n || n.length < 2 || n.length % 2 !== 0)
        throw new Error('path has no point pairs');
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < n.length; i += 2) {
        const x = Number(n[i]);
        const y = Number(n[i + 1]);
        if (x < x0)
            x0 = x;
        if (x > x1)
            x1 = x;
        if (y < y0)
            y0 = y;
        if (y > y1)
            y1 = y;
    }
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
// Fit `box` into the viewbox with `pad` (a fraction of each side) and a scale cap.
// The result is a translate(x,y) scale(k) on one group.
export function cameraFor(box, view, pad = 0.08, maxScale = 40) {
    const w = Math.max(box.width, 1);
    const h = Math.max(box.height, 1);
    const k = Math.min(maxScale, view.width / (w * (1 + 2 * pad)), view.height / (h * (1 + 2 * pad)));
    return { k, x: view.width / 2 - (box.x + box.width / 2) * k, y: view.height / 2 - (box.y + box.height / 2) * k };
}
/** The part of the map the viewport shows: the inverse of the camera over the view. */
export function visibleRect(c, view) {
    return { x: -c.x / c.k, y: -c.y / c.k, width: view.width / c.k, height: view.height / c.k };
}
export const intersects = (a, b) => a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
/** A county fit pads wider than a state's (0.08), so the neighbours stay in view. */
export const COUNTY_PAD = 0.3;
/** The zoom factor UsMap applies on top of a fit: 1 is the fit, ZOOM_MAX its cap. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
export const ZOOM_STEP = 1.5;
/** `zoom` within [ZOOM_MIN, ZOOM_MAX]; anything not finite is the fit. */
export const clampZoom = (zoom) => (Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : ZOOM_MIN);
/** One button press: `dir` 1 zooms in by `step`, -1 out, clamped. */
export const stepZoom = (zoom, dir, step = ZOOM_STEP) => clampZoom(dir === 1 ? clampZoom(zoom) * step : clampZoom(zoom) / step);
/** Scale `c` by `zoom` (clamped) about the centre of the view: the point under the centre stays put. */
export function zoomCamera(c, zoom, view) {
    const z = clampZoom(zoom);
    const cx = view.width / 2;
    const cy = view.height / 2;
    return { k: c.k * z, x: cx - (cx - c.x) * z, y: cy - (cy - c.y) * z };
}
export const ZERO = { x: 0, y: 0 };
/** The camera for the fit panned by `shift` and zoomed by `zoom` about the centre of the view. */
export const viewCamera = (fit, zoom, shift, view) => zoomCamera({ k: fit.k, x: fit.x + shift.x, y: fit.y + shift.y }, zoom, view);
const shiftFor = (fit, cam, zoom, view) => ({
    x: (cam.x - view.width / 2) / zoom - fit.x + view.width / 2,
    y: (cam.y - view.height / 2) / zoom - fit.y + view.height / 2,
});
/** Zoom by `factor` (the zoom stays within [ZOOM_MIN, ZOOM_MAX]) so the view point `p` keeps what is under it. */
export function zoomAbout(fit, zoom, shift, factor, p, view) {
    const z = clampZoom(zoom);
    const next = clampZoom(z * (Number.isFinite(factor) && factor > 0 ? factor : 1));
    const cam = viewCamera(fit, z, shift, view);
    const r = next / z;
    const moved = { k: cam.k * r, x: p.x - (p.x - cam.x) * r, y: p.y - (p.y - cam.y) * r };
    return { zoom: next, shift: shiftFor(fit, moved, next, view) };
}
/** Drag the map by (dx, dy) view units. */
export const panBy = (shift, dx, dy, zoom) => ({ x: shift.x + dx / clampZoom(zoom), y: shift.y + dy / clampZoom(zoom) });
/** Fraction of the smaller of the box and the view that must stay on screen. */
export const KEEP = 0.25;
/**
 * Pan limit: the box (the focused area) keeps at least KEEP of its smaller side in view, on both
 * axes, so it can never leave. At ZOOM_MIN there is no pan.
 */
export function clampShift(fit, zoom, shift, box, view) {
    const z = clampZoom(zoom);
    if (z <= ZOOM_MIN)
        return ZERO;
    const cam = viewCamera(fit, z, shift, view);
    const axis = (pos, lo, size, viewSize) => {
        const keep = KEEP * Math.min(size * cam.k, viewSize);
        return Math.min(viewSize - keep - lo * cam.k, Math.max(keep - (lo + size) * cam.k, pos));
    };
    const x = axis(cam.x, box.x, box.width, view.width);
    const y = axis(cam.y, box.y, box.height, view.height);
    return x === cam.x && y === cam.y ? shift : shiftFor(fit, { k: cam.k, x, y }, z, view);
}
/** A press that moves farther than this many CSS px is a drag, not a click. */
export const DRAG_THRESHOLD = 4;
export const isDrag = (dx, dy, threshold = DRAG_THRESHOLD) => dx * dx + dy * dy > threshold * threshold;
/** The most one wheel event may zoom, in px of delta: a fast flick or a big notch cannot jump. */
export const WHEEL_MAX = 100;
/**
 * The zoom factor of one wheel event. Lines and pages are normalised to px, the delta is capped at
 * WHEEL_MAX, and a pinch on a Mac trackpad (ctrlKey, small deltas) is five times as sensitive.
 * Scrolling up (negative deltaY) zooms in.
 */
export function wheelZoomFactor(deltaY, deltaMode = 0, ctrlKey = false) {
    const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1);
    if (!Number.isFinite(px))
        return 1;
    const capped = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, px));
    return Math.exp(-capped * (ctrlKey ? 0.01 : 0.002));
}
/** Where a client point lands in view units, for an svg drawn into `rect` with `xMidYMid meet`. */
export function clientToView(rect, view, cx, cy) {
    const s = Math.min(rect.width / view.width, rect.height / view.height) || 1;
    return { x: (cx - rect.left - (rect.width - view.width * s) / 2) / s, y: (cy - rect.top - (rect.height - view.height * s) / 2) / s };
}
/** The on-screen rectangle (client px) of a box in map units, under camera `c`. */
export function screenRect(box, c, rect, view) {
    const s = Math.min(rect.width / view.width, rect.height / view.height) || 1;
    const ox = rect.left + (rect.width - view.width * s) / 2;
    const oy = rect.top + (rect.height - view.height * s) / 2;
    return { x: ox + (c.x + box.x * c.k) * s, y: oy + (c.y + box.y * c.k) * s, width: box.width * c.k * s, height: box.height * c.k * s };
}
export const cameraTransform = (c) => `translate(${String(c.x)}px, ${String(c.y)}px) scale(${String(c.k)})`;
/** Corner points of a marker shape around (x, y); null for the circle, which is drawn as a <circle>. */
export function shapePoints(shape, x, y, r) {
    const a = 0.38;
    const pts = shape === 'square' ? [[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]
        : shape === 'triangle' ? [[0, -1.1], [1.05, 0.8], [-1.05, 0.8]]
            : shape === 'diamond' ? [[0, -1.2], [1.2, 0], [0, 1.2], [-1.2, 0]]
                : shape === 'cross' ? [[-a, -1.1], [a, -1.1], [a, -a], [1.1, -a], [1.1, a], [a, a], [a, 1.1], [-a, 1.1], [-a, a], [-1.1, a], [-1.1, -a], [-a, -a]]
                    : [];
    return pts.length === 0 ? null : pts.map(([dx, dy]) => `${(x + dx * r).toFixed(2)},${(y + dy * r).toFixed(2)}`).join(' ');
}
