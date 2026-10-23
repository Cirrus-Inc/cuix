import type { ReactNode } from 'react';
import type { MapLayer } from '../types.ts';

// StreetMap's logic that needs no DOM and no maplibre-gl at run time, so node tests reach it.

/** [west, south, east, north] in degrees. */
export type StreetBBox = [number, number, number, number];

export interface StreetView {
  bbox: StreetBBox;
  zoom: number;
}

/** What `watchView` needs from a MapLibre map. */
export interface ViewSource {
  on(type: 'moveend', fn: () => void): unknown;
  off(type: 'moveend', fn: () => void): unknown;
  isMoving(): boolean;
  getBounds(): { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number };
  getZoom(): number;
}

export const MOVE_END_DEBOUNCE_MS = 200;

/**
 * Calls `cb` with the settled view `ms` after the last `moveend`, and once after
 * subscribing: at once when the camera is still, else after the move in flight
 * (the initial fit) ends. Returns the unsubscribe.
 */
export function watchView(map: ViewSource, cb: (view: StreetView) => void, ms = MOVE_END_DEBOUNCE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    const b = map.getBounds();
    cb({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(fire, ms);
  };
  map.on('moveend', schedule);
  if (!map.isMoving()) schedule();
  return () => {
    clearTimeout(timer);
    map.off('moveend', schedule);
  };
}

/** A pin's stacking rank: its layer's index in `layers`, so the last layer is on top. -1 for an unknown layer. */
export function layerRanks(layers: readonly MapLayer[]): Map<string, number> {
  return new Map(layers.map((l, i) => [l.id, i]));
}

/** The CSS z-index of a pin's marker: above the map's own markers at 0, the last layer highest. */
export const pinZ = (rank: number | undefined) => (rank ?? -1) + 1;

/** Per-cluster aggregates MapLibre computes: `top` is the highest layer rank among the members, `n<i>` the members of layer i. */
export function clusterProperties(layers: readonly MapLayer[]): Record<string, [unknown, unknown]> {
  const props: Record<string, [unknown, unknown]> = { top: ['max', ['get', 'z']] };
  layers.forEach((_, i) => {
    props[`n${String(i)}`] = ['+', ['case', ['==', ['get', 'z'], i], 1, 0]];
  });
  return props;
}

export interface ClusterSummary {
  /** The top-most layer present among the members: the bubble takes its colour and shape. */
  layer?: MapLayer;
  /** Members per layer id, top layer first; layers with none are left out. */
  layers: [string, number][];
}

/** Reads `clusterProperties`' aggregates back from a cluster feature's properties. */
export function clusterSummary(layers: readonly MapLayer[], props: Readonly<Record<string, unknown>>): ClusterSummary {
  const top = typeof props.top === 'number' ? props.top : -1;
  const counts: [string, number][] = [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const n = props[`n${String(i)}`];
    if (typeof n === 'number' && n > 0) counts.push([layers[i].id, n]);
  }
  return { layer: layers[top], layers: counts };
}

/** The default accessible name of a cluster bubble, e.g. "12 pins: Customers 3, Schools 9". */
export function clusterName(count: number, summary: ClusterSummary, layers: readonly MapLayer[]): string {
  const label = new Map(layers.map((l) => [l.id, l.label]));
  const parts = summary.layers.map(([id, n]) => `${label.get(id) ?? id} ${String(n)}`);
  return `${String(count)} pins${parts.length ? `: ${parts.join(', ')}` : ''}`;
}

/** What a pin shows on hover and focus: `tooltip(pin)`, else its label. */
export function tipFor<P extends { label: string }>(pin: P, tooltip?: (pin: P) => ReactNode): ReactNode {
  return tooltip ? tooltip(pin) : pin.label;
}
