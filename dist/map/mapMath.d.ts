import type { MarkerShape } from './types.ts';
export interface BBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Camera {
    x: number;
    y: number;
    k: number;
}
export declare const IDENTITY: Camera;
export declare function pathBBox(d: string): BBox;
export declare function cameraFor(box: BBox, view: {
    width: number;
    height: number;
}, pad?: number, maxScale?: number): Camera;
/** The part of the map the viewport shows: the inverse of the camera over the view. */
export declare function visibleRect(c: Camera, view: {
    width: number;
    height: number;
}): BBox;
export declare const intersects: (a: BBox, b: BBox) => boolean;
/** A county fit pads wider than a state's (0.08), so the neighbours stay in view. */
export declare const COUNTY_PAD = 0.3;
/** The zoom factor UsMap applies on top of a fit: 1 is the fit, ZOOM_MAX its cap. */
export declare const ZOOM_MIN = 1;
export declare const ZOOM_MAX = 8;
export declare const ZOOM_STEP = 1.5;
/** `zoom` within [ZOOM_MIN, ZOOM_MAX]; anything not finite is the fit. */
export declare const clampZoom: (zoom: number) => number;
/** One button press: `dir` 1 zooms in by `step`, -1 out, clamped. */
export declare const stepZoom: (zoom: number, dir: 1 | -1, step?: number) => number;
/** Scale `c` by `zoom` (clamped) about the centre of the view: the point under the centre stays put. */
export declare function zoomCamera(c: Camera, zoom: number, view: {
    width: number;
    height: number;
}): Camera;
/** A pan, in fit units: it scales with the zoom, so a zoom about the centre keeps the centre point put. */
export interface Shift {
    x: number;
    y: number;
}
export declare const ZERO: Shift;
type View = {
    width: number;
    height: number;
};
/** The camera for the fit panned by `shift` and zoomed by `zoom` about the centre of the view. */
export declare const viewCamera: (fit: Camera, zoom: number, shift: Shift, view: View) => Camera;
/** Zoom by `factor` (the zoom stays within [ZOOM_MIN, ZOOM_MAX]) so the view point `p` keeps what is under it. */
export declare function zoomAbout(fit: Camera, zoom: number, shift: Shift, factor: number, p: {
    x: number;
    y: number;
}, view: View): {
    zoom: number;
    shift: Shift;
};
/** Drag the map by (dx, dy) view units. */
export declare const panBy: (shift: Shift, dx: number, dy: number, zoom: number) => Shift;
/** Fraction of the smaller of the box and the view that must stay on screen. */
export declare const KEEP = 0.25;
/**
 * Pan limit: the box (the focused area) keeps at least KEEP of its smaller side in view, on both
 * axes, so it can never leave. At ZOOM_MIN there is no pan.
 */
export declare function clampShift(fit: Camera, zoom: number, shift: Shift, box: BBox, view: View): Shift;
/** A press that moves farther than this many CSS px is a drag, not a click. */
export declare const DRAG_THRESHOLD = 4;
export declare const isDrag: (dx: number, dy: number, threshold?: number) => boolean;
/** The most one wheel event may zoom, in px of delta: a fast flick or a big notch cannot jump. */
export declare const WHEEL_MAX = 100;
/**
 * The zoom factor of one wheel event. Lines and pages are normalised to px, the delta is capped at
 * WHEEL_MAX, and a pinch on a Mac trackpad (ctrlKey, small deltas) is five times as sensitive.
 * Scrolling up (negative deltaY) zooms in.
 */
export declare function wheelZoomFactor(deltaY: number, deltaMode?: number, ctrlKey?: boolean): number;
/** Where a client point lands in view units, for an svg drawn into `rect` with `xMidYMid meet`. */
export declare function clientToView(rect: {
    left: number;
    top: number;
    width: number;
    height: number;
}, view: View, cx: number, cy: number): {
    x: number;
    y: number;
};
/** The on-screen rectangle (client px) of a box in map units, under camera `c`. */
export declare function screenRect(box: BBox, c: Camera, rect: {
    left: number;
    top: number;
    width: number;
    height: number;
}, view: View): BBox;
export declare const cameraTransform: (c: Camera) => string;
/** Corner points of a marker shape around (x, y); null for the circle, which is drawn as a <circle>. */
export declare function shapePoints(shape: MarkerShape, x: number, y: number, r: number): string | null;
export {};
