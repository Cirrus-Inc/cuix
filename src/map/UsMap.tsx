'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { COUNTY_LOADERS } from './geo/countyLoaders.ts';
import { US_STATES, VIEWBOX, type CountyShape } from './geo/usStates.ts';
import { COUNTY_PAD, IDENTITY, cameraFor, cameraTransform, intersects, pathBBox, visibleRect } from './mapMath.ts';
import { Hatch, Marker } from './Marker.tsx';
import { MapStyle, colorVars, shapeColor, type MapColors } from './style.tsx';
import type { MapBucket, MapLevel, MapPoint, MapRegion } from './types.ts';

// A generic US map (HIVE ADR-0012 §6): regions and a level, nothing about what
// they mean. Geometry is generated (scripts/gen-us-map.mjs); county files load on
// demand, one chunk per state, so the US level downloads none.

const [, , VIEW_W, VIEW_H] = VIEWBOX.split(' ').map(Number) as [number, number, number, number];
const VIEW = { width: VIEW_W, height: VIEW_H };

export type CountyLoader = (iso: string) => Promise<{ COUNTIES: CountyShape[] }>;

const defaultLoader: CountyLoader = (iso) => {
  const load = COUNTY_LOADERS[iso];
  return load ? load() : Promise.reject(new Error(`no county file for ${iso}`));
};

type Counties = { status: 'loading' } | { status: 'ok'; iso: string; shapes: CountyShape[] } | { status: 'error' };

function useCounties(iso: string | null, loader: CountyLoader): Counties {
  const [state, setState] = useState<Counties>({ status: 'loading' });
  const load = useRef(loader);
  load.current = loader;
  useEffect(() => {
    if (!iso) return;
    let live = true;
    setState({ status: 'loading' });
    load.current(iso).then(
      (m) => live && setState({ status: 'ok', iso, shapes: m.COUNTIES }),
      () => live && setState({ status: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [iso]);
  return state;
}

type Ring = { kind: 'state' | 'county' | 'point'; id: string; iso: string | null };

export interface UsMapProps {
  level: MapLevel;
  /** The accessible name of the map. */
  label: string;
  /** States that have something to show. Others are drawn as plain, unfocusable shapes. */
  states: readonly MapRegion[];
  /** Counties of the level's state. Ignored at the US level. */
  counties?: readonly MapRegion[];
  /** A state passes its ISO code ('US-FL'), a county its FIPS. */
  onSelect: (kind: 'state' | 'county', id: string) => void;
  /** The counties of the state once its file arrives; null while it loads or at the US level. */
  onCountyShapes?: (counties: readonly { fips: string; name: string }[] | null) => void;
  /** A county of `counties` drawn with a strong outline, e.g. the one a list beside the map points at. */
  highlight?: string | null;
  /** A county of `counties` pointed at or focused; null when it is left. */
  onHover?: (fips: string | null) => void;
  /** State level only: FIPS of the county the camera fits instead of the state. */
  focus?: string | null;
  /** Markers over the counties, state level only. Tab order is alphabetical by name. */
  points?: readonly MapPoint[];
  onSelectPoint?: (id: string) => void;
  /** Content of the built-in tooltip of a point. Default: its `detail`, after the name. */
  renderTooltip?: (point: MapPoint) => ReactNode;
  /** Wraps a point's marker, e.g. in the app's own Tooltip; the built-in one is then off. */
  wrapPoint?: (point: MapPoint, marker: ReactElement) => ReactNode;
  /**
   * State level only: a single click on anything that is not a county or a marker
   * steps back one level. Mouse only; the keyboard has the app's breadcrumb and Esc.
   */
  onBack?: () => void;
  /** Where county shapes come from. Default: the per-state files of `@cirrus/cuix/map/geo/*`. */
  loadCounties?: CountyLoader;
  colors?: Partial<MapColors>;
  className?: string;
  style?: CSSProperties;
  /** Shown when a county file fails to load. */
  errorText?: string;
}

const activate = (e: KeyboardEvent<Element>, run: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    run();
  }
};

const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

export function UsMap({
  level,
  label,
  states,
  counties = [],
  onSelect,
  onCountyShapes,
  highlight,
  onHover,
  focus,
  points,
  onSelectPoint,
  renderTooltip,
  wrapPoint,
  onBack,
  loadCounties = defaultLoader,
  colors,
  className,
  style,
  errorText = 'Could not load the county shapes.',
}: UsMapProps) {
  const hatch = useId();
  const tipId = useId();
  const iso = level.kind === 'state' ? level.iso : null;
  const geo = useCounties(iso, loadCounties);
  const stateShape = iso ? US_STATES.find((s) => s.iso === iso) : undefined;

  const shapes = geo.status === 'ok' && geo.iso === iso ? geo.shapes : null;
  const focused = focus && shapes ? shapes.find((c) => c.fips === focus) : undefined;

  const camera = useMemo(
    () => (focused ? cameraFor(pathBBox(focused.d), VIEW, COUNTY_PAD) : stateShape ? cameraFor(pathBBox(stateShape.d), VIEW) : IDENTITY),
    [focused, stateShape],
  );

  const boxes = useMemo(() => (shapes ? new Map(shapes.map((c) => [c.fips, pathBBox(c.d)])) : null), [shapes]);
  // At county zoom the rest of the state is off-screen: still clickable, out of the tab order.
  const view = focused ? visibleRect(camera, VIEW) : null;
  const offscreen = (box: { x: number; y: number; width: number; height: number } | null | undefined) => (view && box && !intersects(view, box) ? -1 : 0);

  // A ref, so an inline callback that sets the page's state reports once per file.
  const reportShapes = useRef(onCountyShapes);
  reportShapes.current = onCountyShapes;
  useEffect(() => {
    reportShapes.current?.(shapes ? shapes.map((c) => ({ fips: c.fips, name: c.name })) : null);
  }, [shapes]);

  const stateRegions = new Map(states.map((r) => [r.fips, r]));
  const countyRegions = new Map(counties.map((r) => [r.fips, r]));

  const [ring, setRing] = useState<Ring | null>(null);
  const ringOn = (e: FocusEvent<Element>, kind: Ring['kind'], id: string) => {
    if (e.currentTarget.matches(':focus-visible')) setRing({ kind, id, iso });
  };
  const ringOff = () => setRing(null);
  // Keyed by level: a shape that unmounts while focused never fires its blur.
  const live = ring && ring.iso === iso ? ring : null;
  const ringD =
    live?.kind === 'state' ? US_STATES.find((s) => s.fips === live.id)?.d : live?.kind === 'county' ? shapes?.find((c) => c.fips === live.id)?.d : undefined;
  const ringPoint = live?.kind === 'point' && shapes ? points?.find((p) => p.id === live.id) : undefined;

  // The built-in tooltip: on hover or focus, kept while the pointer moves onto it (1.4.13), Esc hides it.
  const [tip, setTip] = useState<string | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showTip = (id: string) => {
    clearTimeout(tipTimer.current);
    setTip(id);
  };
  const hideTip = (delay = 0) => {
    clearTimeout(tipTimer.current);
    if (delay) tipTimer.current = setTimeout(() => setTip(null), delay);
    else setTip(null);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  const tipPoint = !wrapPoint && tip && shapes ? points?.find((p) => p.id === tip) : undefined;
  // The bubble stays open while the pointer is on it (1.4.13 hoverable). Listeners, not
  // JSX handlers: the bubble is not a control, and jsx-a11y would ask for a role.
  const tipBox = useRef<HTMLDivElement>(null);
  const shownId = tipPoint?.id;
  useEffect(() => {
    const el = tipBox.current;
    if (!el || !shownId) return;
    const enter = () => clearTimeout(tipTimer.current);
    const leave = () => setTip(null);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, [shownId]);

  const fillAttr = (b: MapBucket) => (b === 'tint' ? `url(#${hatch})` : undefined);
  const sorted = (list: readonly MapRegion[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));
  const k = camera.k;

  const point = (p: MapPoint) => {
    const n = p.count ?? 1;
    const marker = (
      <g
        key={p.id}
        role="button"
        tabIndex={offscreen({ x: p.x, y: p.y, width: 0, height: 0 })}
        aria-label={p.name}
        aria-describedby={tipPoint?.id === p.id ? tipId : undefined}
        onClick={() => onSelectPoint?.(p.id)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') hideTip();
          activate(e, () => onSelectPoint?.(p.id));
        }}
        onFocus={(e) => {
          ringOn(e, 'point', p.id);
          showTip(p.id);
        }}
        onBlur={() => {
          ringOff();
          hideTip();
        }}
        onMouseEnter={() => showTip(p.id)}
        onMouseLeave={() => hideTip(150)}
        className="cuix-map-hit cuix-map-point"
      >
        {/* Unpainted pad: a tooltip anchored to this box clears the focus ring. */}
        <circle aria-hidden cx={p.x} cy={p.y} r={(n > 1 ? 16 : 12) / k} fill="none" pointerEvents="none" />
        {n > 1 ? (
          <>
            <circle cx={p.x} cy={p.y} r={11 / k} className="cuix-map-badge" style={{ stroke: shapeColor(p.shape ?? 'circle', p.color) }} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="cuix-map-badge-text" style={{ fontSize: `${String(12 / k)}px` }}>
              {badgeText(n)}
            </text>
          </>
        ) : (
          <Marker shape={p.shape} x={p.x} y={p.y} r={5 / k} color={p.color} />
        )}
      </g>
    );
    return wrapPoint ? <g key={p.id}>{wrapPoint(p, marker)}</g> : marker;
  };

  return (
    <div className={className ? `cuix-map ${className}` : 'cuix-map'} style={colorVars(colors, style)}>
      <MapStyle />
      <svg
        viewBox={VIEWBOX}
        role="group"
        aria-label={label}
        onClick={
          iso && onBack
            ? (e) => {
                // detail > 1: the second click of a double-click on a state, which landed after the zoom in.
                if (e.button !== 0 || e.detail > 1 || (e.target as Element).closest('a, [role="button"]')) return;
                onBack();
              }
            : undefined
        }
        className={iso && onBack ? 'cuix-map-zoomout' : undefined}
      >
        <defs>
          <Hatch id={hatch} k={k} />
        </defs>
        <g style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }} className="cuix-map-camera">
          {/* Every state: a quiet outline at the state level, the live shape at the US level. */}
          <g aria-hidden className={iso ? 'cuix-map-faded' : undefined}>
            {US_STATES.filter((s) => (iso === null ? !stateRegions.has(s.fips) : s.iso !== iso)).map((s) => (
              <path key={s.fips} d={s.d} className="cuix-map-none" />
            ))}
          </g>

          {iso === null &&
            sorted(states).map((r) => {
              const s = US_STATES.find((x) => x.fips === r.fips);
              if (!s) return null;
              const click = (e: MouseEvent<Element>) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onSelect('state', s.iso);
              };
              return (
                // An SVG <a> without href is neither focusable nor a link, so a state without one is a button.
                <a
                  key={r.fips}
                  href={r.href}
                  role={r.href ? undefined : 'button'}
                  tabIndex={r.href ? undefined : 0}
                  onKeyDown={r.href ? undefined : (e) => activate(e, () => onSelect('state', s.iso))}
                  aria-label={r.name}
                  onClick={click}
                  onFocus={(e) => ringOn(e, 'state', r.fips)}
                  onBlur={ringOff}
                  className="cuix-map-hit"
                >
                  <path d={s.d} fill={fillAttr(r.bucket)} className={`cuix-map-shape cuix-map-${r.bucket}`} />
                </a>
              );
            })}

          {stateShape && shapes && (
            <>
              <g aria-hidden>
                {shapes
                  .filter((c) => !countyRegions.has(c.fips))
                  .map((c) => (
                    <path key={c.fips} d={c.d} className="cuix-map-none" />
                  ))}
              </g>
              {sorted(counties).flatMap((r) => {
                const c = shapes.find((x) => x.fips === r.fips);
                if (!c) return [];
                return [
                  <g
                    key={r.fips}
                    role="button"
                    tabIndex={offscreen(boxes?.get(r.fips))}
                    aria-label={r.name}
                    onClick={() => onSelect('county', r.fips)}
                    onKeyDown={(e) => activate(e, () => onSelect('county', r.fips))}
                    onMouseEnter={() => onHover?.(r.fips)}
                    onMouseLeave={() => onHover?.(null)}
                    onFocus={(e) => {
                      onHover?.(r.fips);
                      ringOn(e, 'county', r.fips);
                    }}
                    onBlur={() => {
                      onHover?.(null);
                      ringOff();
                    }}
                    className="cuix-map-hit"
                  >
                    <path d={c.d} fill={fillAttr(r.bucket)} className={`cuix-map-shape cuix-map-${r.bucket}`} />
                  </g>,
                ];
              })}
              {/* Drawn after its neighbours, so none paints over it. */}
              {highlight && countyRegions.has(highlight) && (
                <path aria-hidden d={shapes.find((x) => x.fips === highlight)?.d} className="cuix-map-highlight" />
              )}
              {/* County labels live in the zoomed group, sized by 1/k so they keep one size at any scale. */}
              <g aria-hidden>
                {counties.map((r) => {
                  const c = r.label ? shapes.find((x) => x.fips === r.fips) : undefined;
                  if (!c) return null;
                  const solid = r.bucket === 'solid';
                  return (
                    <text
                      key={r.fips}
                      x={c.cx}
                      y={c.cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      // On a filled county the text knocks out of the fill; elsewhere it is haloed.
                      style={{ fontSize: `${String(16 / k)}px`, strokeWidth: 4 / k }}
                      className={solid ? 'cuix-map-label cuix-map-label-solid' : 'cuix-map-label'}
                    >
                      {r.label}
                    </text>
                  );
                })}
              </g>
            </>
          )}

          {/* The selected state's own outline sits above its counties, never over a label. */}
          {stateShape && <path aria-hidden d={stateShape.d} className="cuix-map-outline" />}

          {/* The focus ring is an overlay with non-scaling strokes: an outline inside the zoomed group would scale with the camera. A surface band under a focus line, so it reads on an accent fill too. */}
          {ringD && (
            <g aria-hidden pointerEvents="none">
              <path d={ringD} className="cuix-map-ring-band" />
              <path d={ringD} className="cuix-map-ring-line" />
            </g>
          )}

          {/* Above the counties and the outline; radius / k with a non-scaling stroke, so a marker keeps one size at every level. */}
          {stateShape && shapes && points && [...points].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(point)}

          {/* The marker's ring sits 2px outside its own edge, like an outline-offset-2. */}
          {ringPoint && (
            <g aria-hidden pointerEvents="none">
              <circle cx={ringPoint.x} cy={ringPoint.y} r={((ringPoint.count ?? 1) > 1 ? 15 : 9) / k} className="cuix-map-ring-band" />
              <circle cx={ringPoint.x} cy={ringPoint.y} r={((ringPoint.count ?? 1) > 1 ? 15 : 9) / k} className="cuix-map-ring-line" />
            </g>
          )}
        </g>

        {iso === null && (
          <g aria-hidden>
            {states.map((r) => {
              const s = US_STATES.find((x) => x.fips === r.fips);
              if (!s || !r.label) return null;
              return (
                <text key={r.fips} x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="central" className="cuix-map-label">
                  {r.label}
                </text>
              );
            })}
          </g>
        )}
      </svg>
      {tipPoint && (
        <div
          className="cuix-map-tip"
          style={{
            left: `${String(((camera.x + tipPoint.x * k) / VIEW_W) * 100)}%`,
            top: `${String(((camera.y + tipPoint.y * k) / VIEW_H) * 100)}%`,
          }}
          ref={tipBox}
        >
          <div id={tipId} role="tooltip">
            {renderTooltip ? (
              renderTooltip(tipPoint)
            ) : (
              <>
                {/* The marker's name is its aria-label; hidden here so aria-describedby carries only the detail. */}
                <span aria-hidden>
                  {tipPoint.name}
                  {tipPoint.detail ? ' · ' : ''}
                </span>
                {tipPoint.detail && <span>{tipPoint.detail}</span>}
              </>
            )}
          </div>
        </div>
      )}
      {iso !== null && geo.status === 'error' && (
        <p role="alert" className="cuix-map-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
