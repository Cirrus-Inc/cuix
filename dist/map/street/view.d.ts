import type { ReactNode } from 'react';
import type { MapLayer } from '../types.ts';
/** [west, south, east, north] in degrees. */
export type StreetBBox = [number, number, number, number];
export interface StreetView {
    bbox: StreetBBox;
    zoom: number;
}
/** What `watchView` needs from a MapLibre map. */
export interface ViewSource {
    on(type: 'movestart' | 'moveend', fn: () => void): unknown;
    off(type: 'movestart' | 'moveend', fn: () => void): unknown;
    isMoving(): boolean;
    getBounds(): {
        getWest(): number;
        getSouth(): number;
        getEast(): number;
        getNorth(): number;
    };
    getZoom(): number;
}
export declare const MOVE_END_DEBOUNCE_MS = 200;
/** A longitude in [-180, 180]. */
export declare const wrapLng: (lng: number) => number;
/**
 * The bbox of a view with its longitudes wrapped into [-180, 180]. A view a full turn wide or
 * more is [-180, s, 180, n]; a view across the antimeridian has west > east (RFC 7946 §5.2).
 */
export declare function wrapBBox(west: number, south: number, east: number, north: number): StreetBBox;
/**
 * Calls `cb` with the settled view `ms` after the last `moveend`, and once after
 * subscribing: at once when the camera is still, else after the move in flight
 * (the initial fit) ends. A `movestart` cancels a pending call, so a gesture begun
 * within `ms` is never reported mid-move. Returns the unsubscribe.
 */
export declare function watchView(map: ViewSource, cb: (view: StreetView) => void, ms?: number): () => void;
/**
 * What the camera follows, as a key that changes only when it must move: `bounds`, else
 * `center` + `zoom`, else the pins' extent, but only the first non-empty set of pins. Later
 * pins never move the camera, so pins fetched for the view in `onMoveEnd` cannot refit it.
 * `prev` is the key of the previous render.
 */
export declare function cameraKey(prev: string | null, bounds: unknown, center: {
    lng: number;
    lat: number;
} | undefined, zoom: number, hasPins: boolean): string | null;
/** A pin's stacking rank: its layer's index in `layers`, so the last layer is on top. -1 for an unknown layer. */
export declare function layerRanks(layers: readonly MapLayer[]): Map<string, number>;
/** The CSS z-index of a pin's marker: above the map's own markers at 0, the last layer highest. */
export declare const pinZ: (rank: number | undefined) => number;
/** Per-cluster aggregates MapLibre computes: `top` is the highest layer rank among the members, `n<i>` the members of layer i. */
export declare function clusterProperties(layers: readonly MapLayer[]): Record<string, [unknown, unknown]>;
export interface ClusterSummary {
    /** The top-most layer present among the members: the bubble takes its colour and shape. */
    layer?: MapLayer;
    /** Members per layer id, top layer first; layers with none are left out. */
    layers: [string, number][];
}
/** Reads `clusterProperties`' aggregates back from a cluster feature's properties. */
export declare function clusterSummary(layers: readonly MapLayer[], props: Readonly<Record<string, unknown>>): ClusterSummary;
/** The default accessible name of a cluster bubble, e.g. "12 pins: Customers 3, Schools 9". */
export declare function clusterName(count: number, summary: ClusterSummary, layers: readonly MapLayer[]): string;
/** What a pin shows on hover and focus: `tooltip(pin)`, else its label. */
export declare function tipFor<P extends {
    label: string;
}>(pin: P, tooltip?: (pin: P) => ReactNode): ReactNode;
