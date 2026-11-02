import type { AddLayerObject } from 'maplibre-gl';
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
export declare const SHAPES_SOURCE = "cuix-street-shapes";
export declare const SHAPES_FILL = "cuix-street-shapes-fill";
export declare const SHAPES_LINE = "cuix-street-shapes-line";
export declare const DEFAULT_FILL_OPACITY = 0.08;
export declare const DEFAULT_LINE_WIDTH = 2;
export interface ShapeFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon';
        coordinates: [number, number][][];
    } | {
        type: 'LineString';
        coordinates: [number, number][];
    };
    properties: {
        id: string;
        color: string;
        fillOpacity: number;
        lineWidth: number;
    };
}
export interface ShapeCollection {
    type: 'FeatureCollection';
    features: ShapeFeature[];
}
/**
 * The shapes as GeoJSON. `resolve` turns a CSS colour (it may be a `var()`) into one MapLibre can
 * parse. A polygon ring is closed if it is not, as GeoJSON requires; a shape too short to draw
 * (a line under 2 points, a ring under 3) is dropped.
 */
export declare function shapeFeatures(shapes: readonly StreetShape[], resolve: (css: string) => string): ShapeCollection;
/** What the shape lifecycle needs from a MapLibre map. */
export interface ShapesMap {
    getSource(id: string): unknown;
    getLayer(id: string): unknown;
    addSource(id: string, source: {
        type: 'geojson';
        data: ShapeCollection;
    }): unknown;
    addLayer(layer: AddLayerObject, beforeId?: string): unknown;
    removeLayer(id: string): unknown;
    removeSource(id: string): unknown;
}
/** Adds the source and both layers once, under `beforeId` (the pin layer) when that layer exists. */
export declare function installShapes(map: ShapesMap, data: ShapeCollection, beforeId: string): void;
export declare function removeShapes(map: ShapesMap): void;
/** `setData` on the live source, if it is there. */
export declare function updateShapes(map: Pick<ShapesMap, 'getSource'>, data: ShapeCollection): void;
/** The computed colour of a CSS colour in `host`'s context, so `var(--cuix-map-*)` resolves through the theme. */
export declare function resolveColor(host: HTMLElement, css: string): string;
