/**
 * Lower 48, then Alaska, then Hawaii: the first piece whose clip extent holds
 * the point, as d3 does; null when none does (Puerto Rico, open ocean).
 */
export declare function albersUsa(lng: number, lat: number): [number, number] | null;
/**
 * The inverse of `albersUsa`, d3's `albersUsa().invert`: Alaska and Hawaii by the
 * inset boxes, else the lower 48. null outside the piece the point falls in, or
 * where the conic inverse is undefined.
 */
export declare function albersUsaInvert(x: number, y: number): [number, number] | null;
