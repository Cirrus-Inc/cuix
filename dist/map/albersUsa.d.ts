/**
 * Lower 48, then Alaska, then Hawaii: the first piece whose clip extent holds
 * the point, as d3 does; null when none does (Puerto Rico, open ocean).
 */
export declare function albersUsa(lng: number, lat: number): [number, number] | null;
