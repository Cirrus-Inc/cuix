// Pure port of d3-geo 3.1.1 geoAlbersUsa().scale(1300).translate([487.5, 305]),
// so a lat/lng lands in the same 975x610 space as the generated shapes in ./geo
// (us-atlas's pre-projected files use exactly this projection; HIVE ADR-0012 §2,
// ADR-0014 §4). No map library at runtime.
// Sources: d3-geo src/projection/{albersUsa,albers,conicEqualArea,index}.js, rotation.js, clip/rectangle.js.

const RAD = Math.PI / 180;
const TAU = 2 * Math.PI;
/** d3's `epsilon`, used to shrink the Alaska and Hawaii insets. */
const EPS = 1e-6;

interface Piece {
  /** rotate([lambda, 0]), radians */
  lambda0: number;
  /** center([lng, lat]), degrees */
  centre: [number, number];
  parallels: [number, number];
  k: number;
  /** Translate and clip extent in units of the lower-48 scale (d3 hard-codes these fractions). */
  t: [number, number];
  box: [number, number, number, number];
  /** 0 for the lower 48 (inclusive bounds), EPS for the insets. */
  shrink: number;
}

const K = 1300;
const TX = 487.5;
const TY = 305;

const PIECES: Piece[] = [
  { lambda0: 96 * RAD, centre: [-0.6, 38.7], parallels: [29.5, 45.5], k: K, t: [0, 0], box: [-0.455, -0.238, 0.455, 0.238], shrink: 0 },
  { lambda0: 154 * RAD, centre: [-2, 58.5], parallels: [55, 65], k: K * 0.35, t: [-0.307, 0.201], box: [-0.425, 0.12, -0.214, 0.234], shrink: EPS },
  { lambda0: 157 * RAD, centre: [-3, 19.9], parallels: [8, 18], k: K, t: [-0.205, 0.212], box: [-0.214, 0.166, -0.115, 0.234], shrink: EPS },
];

// conicEqualAreaRaw(y0, y1). None of the three parallel pairs is symmetric about
// the equator, so d3's cylindrical fallback (|n| < epsilon) is not ported.
function conicEqualArea([p0, p1]: [number, number]) {
  const sy0 = Math.sin(p0 * RAD);
  const n = (sy0 + Math.sin(p1 * RAD)) / 2;
  const c = 1 + sy0 * (2 * n - sy0);
  const r0 = Math.sqrt(c) / n;
  const forward = (lambda: number, phi: number): [number, number] => {
    const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
    return [r * Math.sin(lambda * n), r0 - r * Math.cos(lambda * n)];
  };
  const inverse = (x: number, y: number): [number, number] | null => {
    const r0y = r0 - y;
    const r = Math.sign(n) * Math.sqrt(x * x + r0y * r0y);
    let l = Math.atan2(x, Math.abs(r0y)) * Math.sign(r0y);
    if (r0y * n < 0) l -= Math.PI * Math.sign(x) * Math.sign(r0y);
    const s = (c - r * r * n * n) / (2 * n);
    return s >= -1 && s <= 1 ? [l / n, Math.asin(s)] : null;
  };
  return { forward, inverse };
}

// d3 projects the centre through the same raw function and shifts the translate
// so the centre lands on it (projection/index.js recenter()); y is flipped.
interface Projector {
  project: (lng: number, lat: number) => [number, number] | null;
  invert: (x: number, y: number) => [number, number] | null;
}

const PROJECTORS: Projector[] = PIECES.map((p) => {
  const { forward: raw, inverse: rawInverse } = conicEqualArea(p.parallels);
  const [cx, cy] = raw(p.centre[0] * RAD, p.centre[1] * RAD);
  const dx = TX + p.t[0] * K - p.k * cx;
  const dy = TY + p.t[1] * K + p.k * cy;
  const [bx0, by0, bx1, by1] = p.box;
  const x0 = TX + bx0 * K;
  const y0 = TY + by0 * K;
  const x1 = TX + bx1 * K;
  const y1 = TY + by1 * K;
  const project = (lng: number, lat: number): [number, number] | null => {
    let lambda = lng * RAD + p.lambda0;
    if (Math.abs(lambda) > Math.PI) lambda -= Math.round(lambda / TAU) * TAU;
    const [x, y] = raw(lambda, lat * RAD);
    const px = dx + p.k * x;
    const py = dy - p.k * y;
    const e = p.shrink;
    return px >= x0 + e && px <= x1 - e && py >= y0 + e && py <= y1 - e ? [px, py] : null;
  };
  const invert = (px: number, py: number): [number, number] | null => {
    const e = p.shrink;
    if (!(px >= x0 + e && px <= x1 - e && py >= y0 + e && py <= y1 - e)) return null;
    const q = rawInverse((px - dx) / p.k, (dy - py) / p.k);
    if (!q) return null;
    let lng = (q[0] - p.lambda0) / RAD;
    lng -= Math.round(lng / 360) * 360;
    return [lng, q[1] / RAD];
  };
  return { project, invert };
});

/**
 * Lower 48, then Alaska, then Hawaii: the first piece whose clip extent holds
 * the point, as d3 does; null when none does (Puerto Rico, open ocean).
 */
export function albersUsa(lng: number, lat: number): [number, number] | null {
  for (const projector of PROJECTORS) {
    const p = projector.project(lng, lat);
    if (p) return p;
  }
  return null;
}

/**
 * The inverse of `albersUsa`, d3's `albersUsa().invert`: Alaska and Hawaii by the
 * inset boxes, else the lower 48. null outside the piece the point falls in, or
 * where the conic inverse is undefined.
 */
export function albersUsaInvert(x: number, y: number): [number, number] | null {
  const u = (x - TX) / K;
  const v = (y - TY) / K;
  const i = v >= 0.12 && v < 0.234 && u >= -0.425 && u < -0.214 ? 1 : v >= 0.166 && v < 0.234 && u >= -0.214 && u < -0.115 ? 2 : 0;
  return (PROJECTORS[i] as Projector).invert(x, y);
}
