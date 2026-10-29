import type { MapPoint } from './types.ts';
export interface GeoItem {
    id: string;
    name: string;
    lat: number;
    lng: number;
}
export interface PointGroup<T extends GeoItem> extends MapPoint {
    /** Everyone drawn at this spot, by name. */
    members: T[];
    count: number;
}
export interface GroupPointsOptions<T extends GeoItem> {
    /** Grid size in viewbox units (975x610). Default 0.1: only points on the same spot merge. Pass e.g. `8 / camera.k` to cluster by on-screen density. */
    cell?: number;
    /** The accessible name of a group of 2+. Default "<first name> and N more". */
    name?: (members: T[]) => string;
    /** Lat/lng to viewbox. Default `albersUsa`; items it returns null for are dropped. */
    project?: (lng: number, lat: number) => [number, number] | null;
}
/**
 * Projects items into the map's space and collapses those in one grid cell into
 * one point at their mean position, with a `count` UsMap draws as a number badge.
 * A group's id is its first member's (by name).
 */
export declare function groupPoints<T extends GeoItem>(items: readonly T[], options?: GroupPointsOptions<T>): PointGroup<T>[];
