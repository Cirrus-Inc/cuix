import { albersUsa } from './albersUsa.ts';
import type { MapPoint } from './types.ts';

// Point clustering for UsMap, pure. Ported from LuxReach's interpreter layer.

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

const byName = (a: GeoItem, b: GeoItem) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Projects items into the map's space and collapses those in one grid cell into
 * one point at their mean position, with a `count` UsMap draws as a number badge.
 * A group's id is its first member's (by name).
 */
export function groupPoints<T extends GeoItem>(items: readonly T[], options: GroupPointsOptions<T> = {}): PointGroup<T>[] {
  const { cell = 0.1, project = albersUsa } = options;
  const name = options.name ?? ((m: T[]) => `${(m[0] as T).name} and ${String(m.length - 1)} more`);
  const cells = new Map<string, { sx: number; sy: number; list: T[] }>();
  for (const item of items) {
    const xy = project(item.lng, item.lat);
    if (!xy) continue;
    const key = `${String(Math.round(xy[0] / cell))},${String(Math.round(xy[1] / cell))}`;
    const c = cells.get(key);
    if (c) {
      c.sx += xy[0];
      c.sy += xy[1];
      c.list.push(item);
    } else cells.set(key, { sx: xy[0], sy: xy[1], list: [item] });
  }
  return [...cells.values()].map(({ sx, sy, list }) => {
    const members = [...list].sort(byName);
    const first = members[0] as T;
    const n = members.length;
    return { id: first.id, x: round(sx / n), y: round(sy / n), name: n === 1 ? first.name : name(members), members, count: n };
  });
}
