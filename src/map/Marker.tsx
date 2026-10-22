import { useId } from 'react';
import { shapePoints } from './mapMath.ts';
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

/** A region bucket for a legend: the same fill, hatch or outline UsMap draws. */
export function MapSwatch({ bucket }: { bucket: MapBucket }) {
  const id = useId();
  return (
    <>
      <MapStyle />
      <svg aria-hidden viewBox="0 0 24 16" width={24} height={16} style={{ flex: 'none' }}>
        <defs>
          <Hatch id={id} />
        </defs>
        <rect x="1" y="1" width="22" height="14" rx="2" fill={bucket === 'tint' ? `url(#${id})` : undefined} className={`cuix-map-${bucket}`} />
      </svg>
    </>
  );
}
