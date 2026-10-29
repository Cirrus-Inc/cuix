import { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { type CountyShape } from './geo/usStates.ts';
import { type MapColors } from './style.tsx';
import type { MapLevel, MapPoint, MapRegion } from './types.ts';
export type CountyLoader = (iso: string) => Promise<{
    COUNTIES: CountyShape[];
}>;
/** The names of the built-in zoom controls. `fit` is also the Fit button's visible text. */
export interface ZoomLabels {
    group: string;
    zoomIn: string;
    zoomOut: string;
    fit: string;
}
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
    onCountyShapes?: (counties: readonly {
        fips: string;
        name: string;
    }[] | null) => void;
    /** A county of `counties` drawn with a strong outline, e.g. the one a list beside the map points at. */
    highlight?: string | null;
    /** State level only: a county of `counties` kept drawn with the focus ring's look (surface band under a `focusRing` line, 2px at every zoom), e.g. the district the app has open. Not interactive; ignored when the FIPS is not in `counties` or the shapes have not loaded. */
    selected?: string | null;
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
    /**
     * State level only: a factor over the fit camera (the state, or the `focus` county), 1 to 8.
     * Controlled when set; otherwise the map keeps its own, back to 1 whenever the fit changes
     * (another state or another `focus`). The pan (drag, arrow keys, pinch) is always the map's own:
     * it resets with the fit and whenever the zoom is 1.
     */
    zoom?: number;
    /** Called with the new factor when the zoom changes: a control, the wheel, a double-click, a pinch or a key. */
    onZoomChange?: (zoom: number) => void;
    /** The built-in + / − / Fit group at the state level. Default true; false for an app that places its own. */
    zoomControls?: boolean;
    /** Names of the built-in zoom controls. Default: Zoom, Zoom in, Zoom out, Fit. */
    zoomLabels?: Partial<ZoomLabels>;
    /** State level only: `bold` draws the state's county borders at 2px in `border-strong`, a clear grid. Default `hairline`. */
    countyOutline?: 'hairline' | 'bold';
    /**
     * State level only: Google-Maps-style gestures. Wheel or trackpad scroll and pinch zoom about the
     * pointer, double-click zooms in one step, press-and-drag pans (touch: one finger pans, two pinch),
     * and with the map itself focused the arrow keys pan and `+` / `-` zoom. Default true; false keeps
     * the map static (buttons and the controlled `zoom` only).
     */
    gestures?: boolean;
    /**
     * Which wheel events zoom. `plain` (default): any wheel over the map, which also stops the page
     * scrolling while the pointer is over it. `modifier`: only with ctrl or cmd held, as embedded
     * Google Maps does; a plain wheel then scrolls the page. A trackpad pinch (a ctrl wheel) always zooms.
     */
    wheelZoom?: 'plain' | 'modifier';
    /**
     * The on-screen rectangle (client px, like `getBoundingClientRect`) of the `selected` county's
     * shape, or null when there is none. Called after the camera settles on it (not while the
     * transition runs), and again when the map resizes or the page scrolls.
     */
    onSelectedBounds?: (rect: DOMRect | null) => void;
}
export declare function UsMap({ level, label, states, counties, onSelect, onCountyShapes, highlight, selected, onHover, focus, points, onSelectPoint, renderTooltip, wrapPoint, onBack, loadCounties, colors, className, style, errorText, zoom: zoomProp, onZoomChange, zoomControls, zoomLabels, countyOutline, gestures, wheelZoom, onSelectedBounds, }: UsMapProps): import("react").JSX.Element;
