import { type CSSProperties, type ReactNode } from 'react';
import type * as MapLibre from 'maplibre-gl';
import { type MapColors } from '../style.tsx';
import type { MapLayer } from '../types.ts';
import { type StreetView } from './view.ts';
export declare const OPENFREEMAP_LIBERTY = "https://tiles.openfreemap.org/styles/liberty";
export interface StreetPin {
    id: string;
    lat: number;
    lng: number;
    /** A `MapLayer` id: the pin takes that layer's shape and colour. */
    layer: string;
    /** The pin's accessible name. Tab order is by this label. */
    label: string;
}
export interface LngLat {
    lat: number;
    lng: number;
}
/** [[west, south], [east, north]] in degrees. */
export type LngLatBounds = [[number, number], [number, number]];
/** A cluster bubble, as `onSelectCluster` and `cluster.label` get it. */
export interface StreetCluster {
    /** MapLibre's cluster id; it changes with the zoom and the pins. */
    id: number;
    lat: number;
    lng: number;
    count: number;
    /** The top-most layer (last in `layers`) present among the members: the bubble takes its colour and shape. */
    layer?: string;
    /** Members per layer id. */
    layers: Record<string, number>;
}
export interface StreetClusterOptions {
    /** Radius of a cluster in px. Default 50. */
    radius?: number | undefined;
    /** The highest zoom that clusters; above it every pin is drawn. Default 14. */
    maxZoom?: number | undefined;
    /** A bubble's accessible name. Default "12 pins: Customers 3, Schools 9", from the layer labels, top layer first. */
    label?: ((cluster: StreetCluster) => string) | undefined;
}
export interface StreetMapProps {
    /** The accessible name of the map region. */
    label: string;
    /** Fits the camera; wins over `center`. Without both, the camera fits the pins. */
    bounds?: LngLatBounds;
    center?: LngLat;
    /** Zoom with `center`. Default 12. */
    zoom?: number;
    pins?: readonly StreetPin[];
    /** Shape and colour per layer id, and the stacking order: the last layer is drawn on top. The consumer filters `pins` by the layers that are on. */
    layers?: readonly MapLayer[];
    /** A MapLibre style URL. Default OpenFreeMap Liberty (keyless). */
    styleUrl?: string;
    onSelectPin?: (pin: StreetPin) => void;
    /** Content of the popup opened on a pin; no popup without it. */
    renderPopup?: (pin: StreetPin) => ReactNode;
    /** Shown on hover and keyboard focus, without opening the popup. Default: the pin's `label`. */
    tooltip?: ((pin: StreetPin) => ReactNode) | undefined;
    /** Groups nearby pins into counted bubbles; only the bubbles and pins in view are in the DOM. Off by default. */
    cluster?: StreetClusterOptions | undefined;
    /** Replaces a bubble's default action, which zooms in until it splits. */
    onSelectCluster?: ((cluster: StreetCluster) => void) | undefined;
    /** The settled view, 200 ms after the camera stops, and once after mount with the initial view. */
    onMoveEnd?: ((view: StreetView) => void) | undefined;
    /** Where maplibre-gl comes from. Default `import('maplibre-gl')`. */
    loadMapLibre?: () => Promise<typeof MapLibre>;
    colors?: Partial<MapColors>;
    className?: string;
    /** Give the map a height here or through `className`. */
    style?: CSSProperties;
    errorText?: string;
}
export declare function StreetMap({ label, bounds, center, zoom, pins, layers, styleUrl, onSelectPin, renderPopup, tooltip, cluster, onSelectCluster, onMoveEnd, loadMapLibre, colors, className, style, errorText, }: StreetMapProps): import("react").JSX.Element;
