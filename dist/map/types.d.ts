export type MapBucket = 'none' | 'tint' | 'solid';
export interface MapRegion {
    /** 2 digits for a state, 5 for a county. */
    fips: string;
    bucket: MapBucket;
    /** The accessible name of the control, e.g. "Florida: 12 districts". */
    name: string;
    /** Short text drawn on the shape: "FL 12" on a state, a count on a county. */
    label?: string;
    /** Where a state's anchor points, so open-in-new-tab works. A state without one is a button. */
    href?: string;
}
export type MapLevel = {
    kind: 'us';
} | {
    kind: 'state';
    iso: string;
};
/** A marker's shape. Each shape has its own default colour, so a marker is never colour alone. */
export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';
/** A marker in the map's 975x610 space (`albersUsa` projects lat/lng into it). */
export interface MapPoint {
    id: string;
    x: number;
    y: number;
    /** The accessible name of the control. Tab order is by this name. */
    name: string;
    /** Default `circle`. The caller maps its categories to shapes. */
    shape?: MarkerShape;
    /** Any CSS colour; default follows the shape. */
    color?: string;
    /** Supplementary tooltip text, never a repeat of the name. */
    detail?: string;
    /** More than 1 draws a number badge instead of the marker (see `groupPoints`). */
    count?: number;
}
/** One switch of `LayersPanel`, and the style of a layer's pins in `StreetMap`. */
export interface MapLayer {
    id: string;
    label: string;
    /** Shown after the label, e.g. how many points the layer has. */
    count?: number;
    shape?: MarkerShape;
    /** Any CSS colour; default follows the shape. */
    color?: string;
    /** Shown but not toggleable (aria-disabled, stays focusable). */
    disabled?: boolean;
    /** Short text after the label, e.g. "Later" on a disabled layer. */
    hint?: string;
}
