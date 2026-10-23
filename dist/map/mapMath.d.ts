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
export declare const cameraTransform: (c: Camera) => string;
/** Corner points of a marker shape around (x, y); null for the circle, which is drawn as a <circle>. */
export declare function shapePoints(shape: MarkerShape, x: number, y: number, r: number): string | null;
