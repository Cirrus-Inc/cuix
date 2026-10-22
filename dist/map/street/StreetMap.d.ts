import { type CSSProperties, type ReactNode } from 'react';
import type * as MapLibre from 'maplibre-gl';
import { type MapColors } from '../style.tsx';
import type { MapLayer } from '../types.ts';
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
export interface StreetMapProps {
    /** The accessible name of the map region. */
    label: string;
    /** Fits the camera; wins over `center`. Without both, the camera fits the pins. */
    bounds?: LngLatBounds;
    center?: LngLat;
    /** Zoom with `center`. Default 12. */
    zoom?: number;
    pins?: readonly StreetPin[];
    /** Shape and colour per layer id. The consumer filters `pins` by the layers that are on. */
    layers?: readonly MapLayer[];
    /** A MapLibre style URL. Default OpenFreeMap Liberty (keyless). */
    styleUrl?: string;
    onSelectPin?: (pin: StreetPin) => void;
    /** Content of the popup opened on a pin; no popup without it. */
    renderPopup?: (pin: StreetPin) => ReactNode;
    /** Where maplibre-gl comes from. Default `import('maplibre-gl')`. */
    loadMapLibre?: () => Promise<typeof MapLibre>;
    colors?: Partial<MapColors>;
    className?: string;
    /** Give the map a height here or through `className`. */
    style?: CSSProperties;
    errorText?: string;
}
export declare function StreetMap({ label, bounds, center, zoom, pins, layers, styleUrl, onSelectPin, renderPopup, loadMapLibre, colors, className, style, errorText, }: StreetMapProps): import("react").JSX.Element;
