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
export declare const cameraTransform: (c: Camera) => string;
/** Corner points of a marker shape around (x, y); null for the circle, which is drawn as a <circle>. */
export declare function shapePoints(shape: MarkerShape, x: number, y: number, r: number): string | null;
