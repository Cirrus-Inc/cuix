'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type * as MapLibre from 'maplibre-gl';
import { MarkerSwatch } from '../Marker.tsx';
import { MapStyle, colorVars, type MapColors } from '../style.tsx';
import type { MapLayer } from '../types.ts';

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

export interface StreetMapProps {
  /** The accessible name of the map region. */
  label: string;
  /** Fits the camera; wins over `center`. Without both, the camera fits the pins. */
  bounds?: LngLatBounds;
  center?: LngLat;
  /** Zoom with `center`. Default 12. */
  zoom?: number;
  pins?: readonly StreetPin[];
  /** Shape and colour per layer id. The consumer filters `pins` by the layers that are on. */
  layers?: readonly MapLayer[];
  /** A MapLibre style URL. Default OpenFreeMap Liberty (keyless). */
  styleUrl?: string;
  onSelectPin?: (pin: StreetPin) => void;
  /** Content of the popup opened on a pin; no popup without it. */
  renderPopup?: (pin: StreetPin) => ReactNode;
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

  // One DOM element per pin, owned here; the pin's button is portalled into it so it keeps React's events and context.
  const elements = useRef(new Map<string, HTMLElement>());
  const markers = useRef(new Map<string, MapLibre.Marker>());
  const sortedPins = useMemo(() => [...pins].sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id)), [pins]);
  const elementFor = (id: string) => {
    let el = elements.current.get(id);
    if (!el) {
      el = document.createElement('div');
      elements.current.set(id, el);
    }
    return el;
  };

  useEffect(() => {
    if (!map || !lib) return;
    const keep = new Set(sortedPins.map((p) => p.id));
    for (const [id, m] of markers.current) {
      if (keep.has(id)) continue;
      m.remove();
      markers.current.delete(id);
      elements.current.delete(id);
    }
    // Added in label order, so the tab order follows it.
    for (const p of sortedPins) {
      const existing = markers.current.get(p.id);
      if (existing) existing.setLngLat([p.lng, p.lat]);
      else markers.current.set(p.id, new lib.Marker({ element: elementFor(p.id) }).setLngLat([p.lng, p.lat]).addTo(map));
    }
  }, [map, lib, sortedPins]);

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

  const layerOf = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);

  return (
    <div role="region" aria-label={label} className={className ? `cuix-street ${className}` : 'cuix-street'} style={colorVars(colors, style)}>
      <MapStyle />
      <div ref={container} className="cuix-street-canvas" />
      {map &&
        sortedPins.map((p) => {
          const layer = layerOf.get(p.layer);
          return createPortal(
            <button
              type="button"
              aria-label={p.label}
              aria-expanded={renderPopup ? open === p.id : undefined}
              onClick={(e) => {
                // A pin's click must not reach the map: the popup it opens closes on a map click.
                e.stopPropagation();
                onSelectPin?.(p);
                if (renderPopup) setOpen(p.id);
              }}
              className="cuix-street-pin cuix-map-focus"
            >
              <MarkerSwatch shape={layer?.shape} color={layer?.color} size={16} />
            </button>,
            elementFor(p.id),
            p.id,
          );
        })}
      {popupEl && openPin && renderPopup && createPortal(renderPopup(openPin), popupEl)}
      {failed && (
        <p role="alert" className="cuix-map-error">
          {errorText}
        </p>
      )}
    </div>
  );
}
