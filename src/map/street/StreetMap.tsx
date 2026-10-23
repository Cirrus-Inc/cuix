'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type * as MapLibre from 'maplibre-gl';
import { Marker, MarkerSwatch } from '../Marker.tsx';
import { MapStyle, colorVars, mapColor, shapeColor, type MapColors } from '../style.tsx';
import type { MapLayer, MarkerShape } from '../types.ts';
import { clusterName, clusterProperties, clusterSummary, layerRanks, pinZ, tipFor, watchView, type StreetView } from './view.ts';

// The district level: a street map on MapLibre GL and vector tiles. maplibre-gl
// is an optional peer, imported inside an effect, so `@cirrus/cuix/map` never
// loads it and server rendering never touches it. The app imports
// 'maplibre-gl/dist/maplibre-gl.css' itself.

export const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

export interface StreetPin {
  id: string;
  lat: number;
  lng: number;
  /** A `MapLayer` id: the pin takes that layer's shape and colour. */
  layer: string;
  /** The pin's accessible name. Tab order is by this label. */
  label: string;
}

export interface LngLat {
  lat: number;
  lng: number;
}

/** [[west, south], [east, north]] in degrees. */
export type LngLatBounds = [[number, number], [number, number]];

/** A cluster bubble, as `onSelectCluster` and `cluster.label` get it. */
export interface StreetCluster {
  /** MapLibre's cluster id; it changes with the zoom and the pins. */
  id: number;
  lat: number;
  lng: number;
  count: number;
  /** The top-most layer (last in `layers`) present among the members: the bubble takes its colour and shape. */
  layer?: string;
  /** Members per layer id. */
  layers: Record<string, number>;
}

export interface StreetClusterOptions {
  /** Radius of a cluster in px. Default 50. */
  radius?: number;
  /** The highest zoom that clusters; above it every pin is drawn. Default 14. */
  maxZoom?: number;
  /** A bubble's accessible name. Default "12 pins: Customers 3, Schools 9", from the layer labels, top layer first. */
  label?: (cluster: StreetCluster) => string;
}

export interface StreetMapProps {
  /** The accessible name of the map region. */
  label: string;
  /** Fits the camera; wins over `center`. Without both, the camera fits the pins. */
  bounds?: LngLatBounds;
  center?: LngLat;
  /** Zoom with `center`. Default 12. */
  zoom?: number;
  pins?: readonly StreetPin[];
  /** Shape and colour per layer id, and the stacking order: the last layer is drawn on top. The consumer filters `pins` by the layers that are on. */
  layers?: readonly MapLayer[];
  /** A MapLibre style URL. Default OpenFreeMap Liberty (keyless). */
  styleUrl?: string;
  onSelectPin?: (pin: StreetPin) => void;
  /** Content of the popup opened on a pin; no popup without it. */
  renderPopup?: (pin: StreetPin) => ReactNode;
  /** Shown on hover and keyboard focus, without opening the popup. Default: the pin's `label`. */
  tooltip?: (pin: StreetPin) => ReactNode;
  /** Groups nearby pins into counted bubbles; only the bubbles and pins in view are in the DOM. Off by default. */
  cluster?: StreetClusterOptions;
  /** Replaces a bubble's default action, which zooms in until it splits. */
  onSelectCluster?: (cluster: StreetCluster) => void;
  /** The settled view, 200 ms after the camera stops, and once after mount with the initial view. */
  onMoveEnd?: (view: StreetView) => void;
  /** Where maplibre-gl comes from. Default `import('maplibre-gl')`. */
  loadMapLibre?: () => Promise<typeof MapLibre>;
  colors?: Partial<MapColors>;
  className?: string;
  /** Give the map a height here or through `className`. */
  style?: CSSProperties;
  errorText?: string;
}

const loadDefault = () => import('maplibre-gl');

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const SOURCE = 'cuix-street-pins';
type PinData = Parameters<MapLibre.GeoJSONSource['setData']>[0];

interface ClusterHit {
  id: number;
  lat: number;
  lng: number;
  count: number;
  text: string;
  props: Record<string, unknown>;
}

interface Shown {
  key: string;
  pins: Set<string>;
  clusters: ClusterHit[];
}

type Spot = { key: string; lng: number; lat: number; z: number; layer?: MapLayer } & (
  | { kind: 'pin'; pin: StreetPin }
  | { kind: 'cluster'; cluster: StreetCluster; name: string; text: string }
);

interface Actions {
  activate(key: string): void;
  focus(key: string, e: FocusEvent<HTMLButtonElement>): void;
  hover(key: string): void;
  hide(delay?: number): void;
}

interface SpotButtonProps {
  spotKey: string;
  name: string;
  expanded?: boolean;
  shape?: MarkerShape;
  color?: string;
  /** A cluster's count; a pin has none. */
  count?: string;
  /** The tooltip's content while it is shown on this spot, else null. */
  tip: ReactNode;
  /** The tooltip says more than the name, so the button points at it. */
  describe: boolean;
  tipId: string;
  tipBox: RefObject<HTMLDivElement | null>;
  act: RefObject<Actions>;
}

// Memoised: hovering one spot re-renders that spot, not every pin on the map.
const SpotButton = memo(function SpotButton({ spotKey, name, expanded, shape, color, count, tip, describe, tipId, tipBox, act }: SpotButtonProps) {
  const shown = tip !== null && tip !== undefined;
  return (
    <>
      <button
        type="button"
        aria-label={name}
        aria-expanded={expanded}
        aria-describedby={shown && describe ? tipId : undefined}
        onClick={(e) => {
          // A pin's click must not reach the map: the popup it opens closes on a map click.
          e.stopPropagation();
          act.current.activate(spotKey);
        }}
        onFocus={(e) => act.current.focus(spotKey, e)}
        onBlur={() => act.current.hide()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') act.current.hide();
        }}
        onMouseEnter={() => act.current.hover(spotKey)}
        onMouseLeave={() => act.current.hide(150)}
        className={count === undefined ? 'cuix-street-pin cuix-map-focus' : 'cuix-street-pin cuix-street-cluster cuix-map-focus'}
      >
        {count === undefined ? (
          <MarkerSwatch shape={shape} color={color} size={16} />
        ) : (
          <svg aria-hidden viewBox="0 0 36 36" width={36} height={36}>
            <circle cx={18} cy={18} r={15} className="cuix-map-badge cuix-street-bubble" style={{ stroke: color }} />
            <text x={18} y={18} textAnchor="middle" dominantBaseline="central" className="cuix-map-badge-text" style={{ fontSize: '12px' }}>
              {count}
            </text>
            {shape && <Marker shape={shape} x={31} y={5} r={4.5} color={color} />}
          </svg>
        )}
      </button>
      {shown && (
        <div ref={tipBox} className="cuix-map-tip cuix-street-tip">
          {describe ? (
            <div id={tipId} role="tooltip">
              {tip}
            </div>
          ) : (
            // The default tooltip repeats the accessible name: shown, not announced twice.
            <div aria-hidden>{tip}</div>
          )}
        </div>
      )}
    </>
  );
});

export function StreetMap({
  label,
  bounds,
  center,
  zoom = 12,
  pins = [],
  layers = [],
  styleUrl = OPENFREEMAP_LIBERTY,
  onSelectPin,
  renderPopup,
  tooltip,
  cluster,
  onSelectCluster,
  onMoveEnd,
  loadMapLibre = loadDefault,
  colors,
  className,
  style,
  errorText = 'Could not load the street map.',
}: StreetMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [lib, setLib] = useState<typeof MapLibre | null>(null);
  const [map, setMap] = useState<MapLibre.Map | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const tipId = useId();

  const load = useRef(loadMapLibre);
  load.current = loadMapLibre;
  const firstStyle = useRef(styleUrl);

  useEffect(() => {
    let live = true;
    let created: MapLibre.Map | null = null;
    load.current().then(
      (ml) => {
        if (!live || !container.current) return;
        created = new ml.Map({ container: container.current, style: firstStyle.current, center: [-98.5, 39.8], zoom: 3, attributionControl: { compact: false } });
        created.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        setLib(ml);
        setMap(created);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      created?.remove();
    };
  }, []);

  useEffect(() => {
    if (map && styleUrl !== firstStyle.current) {
      firstStyle.current = styleUrl;
      map.setStyle(styleUrl);
    }
  }, [map, styleUrl]);

  // Camera: bounds, else centre, else the pins' extent.
  const pinBox = useMemo((): LngLatBounds | null => {
    if (pins.length === 0) return null;
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const p of pins) {
      w = Math.min(w, p.lng);
      e = Math.max(e, p.lng);
      s = Math.min(s, p.lat);
      n = Math.max(n, p.lat);
    }
    return [
      [w, s],
      [e, n],
    ];
  }, [pins]);
  const target = bounds ?? (center ? null : pinBox);
  const cameraKey = JSON.stringify(target ?? [center?.lng, center?.lat, zoom]);
  useEffect(() => {
    if (!map) return;
    const animate = !reducedMotion();
    if (target) map.fitBounds(target, { padding: 48, maxZoom: 15, animate });
    else if (center) map.easeTo({ center: [center.lng, center.lat], zoom, animate });
  }, [map, cameraKey]);

  // After the camera effect, so a first fit in flight is waited for and the first view is the fitted one.
  const moveEnd = useRef(onMoveEnd);
  moveEnd.current = onMoveEnd;
  useEffect(() => {
    if (!map) return;
    return watchView(map, (view) => moveEnd.current?.(view));
  }, [map]);

  const ranks = useMemo(() => layerRanks(layers), [layers]);
  const layerOf = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const layersKey = layers.map((l) => l.id).join('\n');

  // Clustering: a GeoJSON source clusters in MapLibre's worker; an invisible layer keeps its tiles loaded,
  // and only the bubbles and pins in view become DOM markers, so thousands of pins cost a few hundred elements.
  const clusterOn = Boolean(cluster);
  const radius = cluster?.radius ?? 50;
  const maxZoom = cluster?.maxZoom ?? 14;
  const data = useMemo(
    (): PinData | null =>
      clusterOn
        ? {
            type: 'FeatureCollection',
            features: pins.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, z: ranks.get(p.layer) ?? -1 } })),
          }
        : null,
    [clusterOn, pins, ranks],
  );
  const dataRef = useRef(data);
  dataRef.current = data;
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!map || !clusterOn) return;
    const install = () => {
      if (map.getSource(SOURCE)) return;
      map.addSource(SOURCE, {
        type: 'geojson',
        data: dataRef.current ?? { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: radius,
        clusterMaxZoom: maxZoom,
        clusterProperties: clusterProperties(layersRef.current),
      });
      map.addLayer({ id: SOURCE, type: 'circle', source: SOURCE, paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
    };
    const refresh = () => {
      if (!map.getSource(SOURCE) || !map.isSourceLoaded(SOURCE)) return;
      const view = map.getBounds();
      const pinIds = new Set<string>();
      const clusters = new Map<number, ClusterHit>();
      // Features repeat across tiles and tiles reach past the viewport: dedupe, then keep what is in view.
      for (const f of map.querySourceFeatures(SOURCE)) {
        if (f.geometry.type !== 'Point') continue;
        const [lng, lat] = f.geometry.coordinates;
        if (!view.contains([lng, lat])) continue;
        const p = f.properties as Record<string, unknown>;
        if (p.cluster === true && typeof p.cluster_id === 'number') {
          if (clusters.has(p.cluster_id)) continue;
          const count = Number(p.point_count);
          clusters.set(p.cluster_id, { id: p.cluster_id, lng, lat, count, text: String(p.point_count_abbreviated ?? count), props: p });
        } else if (typeof p.id === 'string') pinIds.add(p.id);
      }
      const list = [...clusters.values()].sort((a, b) => b.lat - a.lat || a.lng - b.lng);
      const key = `${[...pinIds].sort().join('\n')}|${list.map((c) => c.id).join(',')}`;
      setShown((cur) => (cur?.key === key ? cur : { key, pins: pinIds, clusters: list }));
    };
    const onData = (e: MapLibre.MapSourceDataEvent) => {
      if (e.sourceId === SOURCE && map.isSourceLoaded(SOURCE)) refresh();
    };
    try {
      install();
    } catch {
      // The style is still loading: 'style.load' installs the source.
    }
    map.on('style.load', install);
    map.on('moveend', refresh);
    map.on('sourcedata', onData);
    return () => {
      map.off('style.load', install);
      map.off('moveend', refresh);
      map.off('sourcedata', onData);
      if (map.getLayer(SOURCE)) map.removeLayer(SOURCE);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      setShown(null);
    };
  }, [map, clusterOn, radius, maxZoom, layersKey]);

  useEffect(() => {
    const source = map?.getSource(SOURCE) as MapLibre.GeoJSONSource | undefined;
    if (data && source) void source.setData(data);
  }, [map, data]);

  // Everything drawn as a DOM marker, in tab order: pins by label, then bubbles north to south.
  const sortedPins = useMemo(() => [...pins].sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id)), [pins]);
  const clusterLabel = cluster?.label;
  const spots = useMemo((): Spot[] => {
    const pinSpot = (p: StreetPin): Spot => ({ kind: 'pin', key: `p:${p.id}`, lng: p.lng, lat: p.lat, z: pinZ(ranks.get(p.layer)), pin: p, layer: layerOf.get(p.layer) });
    if (!clusterOn) return sortedPins.map(pinSpot);
    if (!shown) return [];
    const out = sortedPins.filter((p) => shown.pins.has(p.id)).map(pinSpot);
    for (const hit of shown.clusters) {
      const summary = clusterSummary(layers, hit.props);
      const c: StreetCluster = { id: hit.id, lat: hit.lat, lng: hit.lng, count: hit.count, layer: summary.layer?.id, layers: Object.fromEntries(summary.layers) };
      out.push({
        kind: 'cluster',
        key: `c:${String(hit.id)}`,
        lng: hit.lng,
        lat: hit.lat,
        z: layers.length + 1,
        cluster: c,
        name: clusterLabel?.(c) ?? clusterName(hit.count, summary, layers),
        text: hit.text,
        layer: summary.layer,
      });
    }
    return out;
  }, [clusterOn, shown, sortedPins, ranks, layerOf, layers, clusterLabel]);
  const spotOf = useMemo(() => new Map(spots.map((s) => [s.key, s])), [spots]);

  // The tooltip: on hover or keyboard focus, kept while the pointer moves onto it (1.4.13), Esc hides it.
  const [tip, setTip] = useState<string | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tipBox = useRef<HTMLDivElement>(null);
  const showTip = (key: string) => {
    clearTimeout(tipTimer.current);
    setTip(key);
  };
  const hideTip = (delay = 0) => {
    clearTimeout(tipTimer.current);
    if (delay) tipTimer.current = setTimeout(() => setTip(null), delay);
    else setTip(null);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  const tipSpot = tip ? spotOf.get(tip) : undefined;
  // The bubble stays open while the pointer is on it (1.4.13 hoverable). Listeners, not
  // JSX handlers: the bubble is not a control, and jsx-a11y would ask for a role.
  useEffect(() => {
    const el = tipBox.current;
    if (!el || !tipSpot) return;
    const enter = () => clearTimeout(tipTimer.current);
    const leave = () => setTip(null);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, [tipSpot?.key]);

  // One DOM element per spot, owned here; the spot's button is portalled into it so it keeps React's events and context.
  const elements = useRef(new Map<string, HTMLElement>());
  const markers = useRef(new Map<string, MapLibre.Marker>());
  const elementFor = (key: string) => {
    let el = elements.current.get(key);
    if (!el) {
      el = document.createElement('div');
      elements.current.set(key, el);
    }
    return el;
  };
  // Above every layer and every bubble: the spot showing its tooltip.
  const topZ = layers.length + 2;
  const tipKey = useRef(tip);
  tipKey.current = tip;

  useEffect(() => {
    if (!map || !lib) return;
    const keep = new Set(spots.map((s) => s.key));
    for (const [key, m] of markers.current) {
      if (keep.has(key)) continue;
      m.remove();
      markers.current.delete(key);
      elements.current.delete(key);
    }
    // Kept in spot order, so the tab order follows the labels when pins are added later too. Only
    // misplaced elements move: moving a focused one would blur it.
    let prev: HTMLElement | null = null;
    for (const s of spots) {
      const existing = markers.current.get(s.key);
      if (existing) existing.setLngLat([s.lng, s.lat]);
      else markers.current.set(s.key, new lib.Marker({ element: elementFor(s.key) }).setLngLat([s.lng, s.lat]).addTo(map));
      const el = elementFor(s.key);
      // Stacking by layer through z-index, not DOM order, which is the tab order.
      el.style.zIndex = String(s.key === tipKey.current ? topZ : s.z);
      if (prev && el.previousElementSibling !== prev) prev.after(el);
      prev = el;
    }
  }, [map, lib, spots]);

  useEffect(() => {
    const el = tip ? elements.current.get(tip) : undefined;
    const s = tip ? spotOf.get(tip) : undefined;
    if (!el || !s) return;
    el.style.zIndex = String(topZ);
    return () => {
      el.style.zIndex = String(s.z);
    };
  }, [tip, spotOf, topZ]);

  useEffect(
    () => () => {
      for (const m of markers.current.values()) m.remove();
      markers.current.clear();
    },
    [],
  );

  // The popup: MapLibre positions it, React renders into it.
  const [popupEl, setPopupEl] = useState<HTMLElement | null>(null);
  const openPin = open ? pins.find((p) => p.id === open) : undefined;
  useEffect(() => {
    if (!map || !lib || !openPin || !renderPopup) return;
    const el = document.createElement('div');
    const popup = new lib.Popup({ offset: 16, maxWidth: '20rem', focusAfterOpen: false })
      .setLngLat([openPin.lng, openPin.lat])
      .setDOMContent(el)
      .addTo(map);
    popup.on('close', () => setOpen((cur) => (cur === openPin.id ? null : cur)));
    setPopupEl(el);
    return () => {
      setPopupEl(null);
      popup.remove();
    };
  }, [map, lib, openPin?.id, openPin?.lat, openPin?.lng, Boolean(renderPopup)]);

  const act = useRef<Actions>(null as unknown as Actions);
  act.current = {
    activate(key) {
      const s = spotOf.get(key);
      if (!s) return;
      hideTip();
      if (s.kind === 'pin') {
        onSelectPin?.(s.pin);
        if (renderPopup) setOpen(s.pin.id);
        return;
      }
      if (onSelectCluster) {
        onSelectCluster(s.cluster);
        return;
      }
      if (!map) return;
      // The bubble unmounts as it splits: hand focus to the map, from where Tab reaches the new pins.
      if (elements.current.get(key)?.contains(document.activeElement)) map.getCanvas().focus({ preventScroll: true });
      const source = map.getSource(SOURCE) as MapLibre.GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(s.cluster.id).then(
        (z) => map.easeTo({ center: [s.lng, s.lat], zoom: z, animate: !reducedMotion() }),
        () => undefined,
      );
    },
    focus(key, e) {
      // Keyboard focus only: a click opens the popup, which the tooltip would cover.
      if (e.currentTarget.matches(':focus-visible')) showTip(key);
    },
    hover: showTip,
    hide: hideTip,
  };

  return (
    <div role="region" aria-label={label} className={className ? `cuix-street ${className}` : 'cuix-street'} style={colorVars(colors, style)}>
      <MapStyle />
      <div ref={container} className="cuix-street-canvas" />
      {map &&
        spots.map((s) =>
          createPortal(
            <SpotButton
              spotKey={s.key}
              name={s.kind === 'pin' ? s.pin.label : s.name}
              expanded={s.kind === 'pin' && renderPopup ? open === s.pin.id : undefined}
              shape={s.layer ? (s.layer.shape ?? 'circle') : undefined}
              color={s.kind === 'pin' ? s.layer?.color : s.layer ? shapeColor(s.layer.shape ?? 'circle', s.layer.color) : mapColor('foregroundMuted')}
              count={s.kind === 'cluster' ? s.text : undefined}
              tip={tip === s.key ? (s.kind === 'pin' ? tipFor(s.pin, tooltip) : s.name) : null}
              describe={s.kind === 'pin' && Boolean(tooltip)}
              tipId={tipId}
              tipBox={tipBox}
              act={act}
            />,
            elementFor(s.key),
            s.key,
          ),
        )}
      {popupEl && openPin && renderPopup && createPortal(renderPopup(openPin), popupEl)}
      {failed && (
        <p role="alert" className="cuix-map-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
