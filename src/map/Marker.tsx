import { useId } from 'react';
import { BADGE_FONT, BADGE_OFF, BADGE_R, badgeText, hasBadge, shapePoints } from './mapMath.ts';
import { MapStyle, shapeColor } from './style.tsx';
import type { MapBucket, MarkerShape } from './types.ts';

/** One marker shape centred on (x, y). The swatches draw exactly the same thing. */
export function Marker({ shape = 'circle', x, y, r, color }: { shape?: MarkerShape; x: number; y: number; r: number; color?: string }) {
  const style = { fill: shapeColor(shape, color) };
  const points = shapePoints(shape, x, y, r);
  return points ? (
    <polygon points={points} style={style} className="cuix-map-marker" />
  ) : (
    <circle cx={x} cy={y} r={r} style={style} className="cuix-map-marker" />
  );
}

/**
 * A marker with an optional count badge anchored at its top-right: the shape is always drawn,
 * and the badge (a `cuix-map-badge` ring in the shape's colour around the number) sits over its
 * corner, so a triangle stays a triangle however many it stands for. `count` draws a badge from
 * `badgeFrom` up (default 2); `u` is one marker unit in the surrounding coordinate space (`1 / k`
 * inside UsMap's camera, 1 in a pixel-sized svg).
 */
export function CountMark({
  shape = 'circle',
  x,
  y,
  r,
  color,
  count,
  badgeFrom = 2,
  u = 1,
}: {
  shape?: MarkerShape;
  x: number;
  y: number;
  r: number;
  color?: string;
  count?: number;
  badgeFrom?: 1 | 2;
  u?: number;
}) {
  const bx = x + BADGE_OFF * u;
  const by = y - BADGE_OFF * u;
  return (
    <>
      <Marker shape={shape} x={x} y={y} r={r} color={color} />
      {hasBadge(count, badgeFrom) && (
        <>
          <circle cx={bx} cy={by} r={BADGE_R * u} className="cuix-map-badge" style={{ stroke: shapeColor(shape, color) }} />
          <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" className="cuix-map-badge-text" style={{ fontSize: `${String(BADGE_FONT * u)}px` }}>
            {badgeText(count)}
          </text>
        </>
      )}
    </>
  );
}

/** A marker for a legend or a layer row, 12px by default. */
export function MarkerSwatch({ shape = 'circle', color, size = 12 }: { shape?: MarkerShape; color?: string; size?: number }) {
  return (
    <>
      <MapStyle />
      <svg aria-hidden viewBox="0 0 12 12" width={size} height={size} style={{ flex: 'none', overflow: 'visible' }}>
        <Marker shape={shape} x={6} y={6} r={4.5} color={color} />
      </svg>
    </>
  );
}

/**
 * The hatch of the "tint" bucket. `k` is the camera scale: the pattern lives in
 * the zoomed group, so it is shrunk by 1/k to keep the hatch 6px at every level.
 */
export function Hatch({ id, k = 1 }: { id: string; k?: number }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={`rotate(45) scale(${String(1 / k)})`}>
      <rect width="6" height="6" className="cuix-map-hatch-bg" />
      <line x1="0" y1="0" x2="0" y2="6" className="cuix-map-hatch-line" />
    </pattern>
  );
}

/** A region bucket for a legend: the same fill, hatch or outline UsMap draws; `shade` draws a count layer's colour over the bucket's outline. */
export function MapSwatch({ bucket = 'none', shade }: { bucket?: MapBucket; shade?: string }) {
  const id = useId();
  return (
    <>
      <MapStyle />
      <svg aria-hidden viewBox="0 0 24 16" width={24} height={16} style={{ flex: 'none' }}>
        <defs>
          <Hatch id={id} />
        </defs>
        <rect x="1" y="1" width="22" height="14" rx="2" fill={shade ? shade : bucket === 'tint' ? `url(#${id})` : undefined} className={`cuix-map-${shade ? 'shade' : bucket}`} />
      </svg>
    </>
  );
}
