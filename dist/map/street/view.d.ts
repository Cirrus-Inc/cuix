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
/**
 * Stacking, for `n` layers, bottom to top:
 * - `pinZ(rank)`, 0..n: a pin that clusters (or any pin when clustering is off), by layer rank;
 * - `bubbleZ(n)`, n + 1: every cluster bubble;
 * - `unclusteredPinZ(rank, n)`, n + 2..2n + 2: a pin of a layer outside `cluster.layers`, by layer rank,
 *   so a sparse layer that never clusters is never under a bubble or a clustered pin;
 * - `tipZ(n)`, 2n + 3: the spot showing its tooltip.
 */
export declare const pinZ: (rank: number | undefined) => number;
export declare const bubbleZ: (n: number) => number;
export declare const unclusteredPinZ: (rank: number | undefined, n: number) => number;
export declare const tipZ: (n: number) => number;
/** The layer ids that cluster: `cluster.layers` as a set, or null when every layer clusters. */
export declare const clusteredSet: (ids: readonly string[] | undefined) => ReadonlySet<string> | null;
/** Whether a pin of `layer` goes into the clustered source. */
export declare const clusters: (only: ReadonlySet<string> | null, layer: string) => boolean;
/** Splits pins into those that cluster and those always drawn as markers. */
export declare function splitPins<P extends {
    layer: string;
}>(pins: readonly P[], only: ReadonlySet<string> | null): {
    clustered: P[];
    free: P[];
};
/**
 * Per-cluster aggregates MapLibre computes: `top` is the highest layer rank among the members, `n<i>` the members of layer i.
 * Only the layers that cluster get a count.
 */
export declare function clusterProperties(layers: readonly MapLayer[], only?: ReadonlySet<string> | null): Record<string, [unknown, unknown]>;
export interface ClusterSummary {
    /** The top-most layer present among the members: the bubble takes its colour and shape. */
    layer?: MapLayer;
    /** Members per layer id, top layer first; layers with none are left out. */
    layers: [string, number][];
}
/** Reads `clusterProperties`' aggregates back from a cluster feature's properties; a layer outside `only` is never counted nor the bubble's colour. */
export declare function clusterSummary(layers: readonly MapLayer[], props: Readonly<Record<string, unknown>>, only?: ReadonlySet<string> | null): ClusterSummary;
/** The default accessible name of a cluster bubble, e.g. "12 pins: Customers 3, Schools 9". */
export declare function clusterName(count: number, summary: ClusterSummary, layers: readonly MapLayer[]): string;
/** What a pin shows on hover and focus: `tooltip(pin)`, else its label. */
export declare function tipFor<P extends {
    label: string;
}>(pin: P, tooltip?: (pin: P) => ReactNode): ReactNode;
/** A cluster bubble in view, read from a cluster feature. */
export interface ClusterHit {
    id: number;
    lat: number;
    lng: number;
    count: number;
    text: string;
    props: Record<string, unknown>;
}
/** A feature as `querySourceFeatures` returns it. */
export interface SourceFeature {
    geometry: {
        type: string;
        coordinates?: unknown;
    };
    properties: unknown;
}
/**
 * The pins and bubbles in view among a clustered source's features: features repeat across tiles and
 * tiles reach past the viewport, so they are deduped and kept only when `inView`. Bubbles north to south.
 */
export declare function clusterHits(features: Iterable<SourceFeature>, inView: (lngLat: [number, number]) => boolean): {
    pins: Set<string>;
    clusters: ClusterHit[];
};
type ClusterEvent = 'moveend' | 'sourcedata' | 'idle';
/** What `watchClusters` needs from a MapLibre map. */
export interface ClusterSource {
    on(type: ClusterEvent, fn: (e: {
        sourceId?: string;
    }) => void): unknown;
    off(type: ClusterEvent, fn: (e: {
        sourceId?: string;
    }) => void): unknown;
    isSourceLoaded(id: string): boolean;
}
/**
 * Calls `refresh` when the camera stops, when `source`'s data loads, and on `idle`. The `idle` pass is
 * the one that settles the bubbles: while a zoom's tiles load, MapLibre keeps the loaded parent tiles
 * as cover and `querySourceFeatures` returns their bubbles next to the children's. The last tile's
 * `sourcedata` still sees the parents; they are dropped on the next frame, which fires no `sourcedata`,
 * and `idle` comes once every tile is loaded and rendered (Cirrus-Inc/cuix#85). Returns the unsubscribe.
 */
export declare function watchClusters(map: ClusterSource, source: string, refresh: () => void): () => void;
export {};
