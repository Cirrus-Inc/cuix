import type { MapBucket, MarkerShape } from './types.ts';
/** One marker shape centred on (x, y). The swatches draw exactly the same thing. */
export declare function Marker({ shape, x, y, r, color }: {
    shape?: MarkerShape;
    x: number;
    y: number;
    r: number;
    color?: string;
}): import("react").JSX.Element;
/** A marker for a legend or a layer row, 12px by default. */
export declare function MarkerSwatch({ shape, color, size }: {
    shape?: MarkerShape;
    color?: string;
    size?: number;
}): import("react").JSX.Element;
/**
 * The hatch of the "tint" bucket. `k` is the camera scale: the pattern lives in
 * the zoomed group, so it is shrunk by 1/k to keep the hatch 6px at every level.
 */
export declare function Hatch({ id, k }: {
    id: string;
    k?: number;
}): import("react").JSX.Element;
/** A region bucket for a legend: the same fill, hatch or outline UsMap draws. */
export declare function MapSwatch({ bucket }: {
    bucket: MapBucket;
}): import("react").JSX.Element;
