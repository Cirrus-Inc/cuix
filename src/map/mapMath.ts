// Pure geometry helpers for UsMap. No DOM.

import type { MarkerShape } from './types.ts';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Camera {
  x: number;
  y: number;
  k: number;
}

export const IDENTITY: Camera = { x: 0, y: 0, k: 1 };

// The generated paths hold only absolute M/L/Z commands (geoPath(null).digits(1)),
// so every number pair is a point.
export function pathBBox(d: string): BBox {
  const n = d.match(/-?\d+(?:\.\d+)?/g);
  if (!n || n.length < 2 || n.length % 2 !== 0) throw new Error('path has no point pairs');
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n.length; i += 2) {
    const x = Number(n[i]);
    const y = Number(n[i + 1]);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

// Fit `box` into the viewbox with `pad` (a fraction of each side) and a scale cap.
// The result is a translate(x,y) scale(k) on one group.
export function cameraFor(box: BBox, view: { width: number; height: number }, pad = 0.08, maxScale = 40): Camera {
  const w = Math.max(box.width, 1);
  const h = Math.max(box.height, 1);
  const k = Math.min(maxScale, view.width / (w * (1 + 2 * pad)), view.height / (h * (1 + 2 * pad)));
  return { k, x: view.width / 2 - (box.x + box.width / 2) * k, y: view.height / 2 - (box.y + box.height / 2) * k };
}

/** The part of the map the viewport shows: the inverse of the camera over the view. */
export function visibleRect(c: Camera, view: { width: number; height: number }): BBox {
  return { x: -c.x / c.k, y: -c.y / c.k, width: view.width / c.k, height: view.height / c.k };
}

export const intersects = (a: BBox, b: BBox): boolean =>
  a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;

/** A county fit pads wider than a state's (0.08), so the neighbours stay in view. */
export const COUNTY_PAD = 0.3;

/** The zoom factor UsMap applies on top of a fit: 1 is the fit, ZOOM_MAX its cap. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
export const ZOOM_STEP = 1.5;

/** `zoom` within [ZOOM_MIN, ZOOM_MAX]; anything not finite is the fit. */
export const clampZoom = (zoom: number): number => (Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : ZOOM_MIN);

/** One button press: `dir` 1 zooms in by `step`, -1 out, clamped. */
export const stepZoom = (zoom: number, dir: 1 | -1, step = ZOOM_STEP): number => clampZoom(dir === 1 ? clampZoom(zoom) * step : clampZoom(zoom) / step);

/** Scale `c` by `zoom` (clamped) about the centre of the view: the point under the centre stays put. */
export function zoomCamera(c: Camera, zoom: number, view: { width: number; height: number }): Camera {
  const z = clampZoom(zoom);
  const cx = view.width / 2;
  const cy = view.height / 2;
  return { k: c.k * z, x: cx - (cx - c.x) * z, y: cy - (cy - c.y) * z };
}

export const cameraTransform = (c: Camera) => `translate(${String(c.x)}px, ${String(c.y)}px) scale(${String(c.k)})`;

/** Corner points of a marker shape around (x, y); null for the circle, which is drawn as a <circle>. */
export function shapePoints(shape: MarkerShape, x: number, y: number, r: number): string | null {
  const a = 0.38;
  const pts: [number, number][] =
    shape === 'square' ? [[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]]
    : shape === 'triangle' ? [[0, -1.1], [1.05, 0.8], [-1.05, 0.8]]
    : shape === 'diamond' ? [[0, -1.2], [1.2, 0], [0, 1.2], [-1.2, 0]]
    : shape === 'cross' ? [[-a, -1.1], [a, -1.1], [a, -a], [1.1, -a], [1.1, a], [a, a], [a, 1.1], [-a, 1.1], [-a, a], [-1.1, a], [-1.1, -a], [-a, -a]]
    : [];
  return pts.length === 0 ? null : pts.map(([dx, dy]) => `${(x + dx * r).toFixed(2)},${(y + dy * r).toFixed(2)}`).join(' ');
}
