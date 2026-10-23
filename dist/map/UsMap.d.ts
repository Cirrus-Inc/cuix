import { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { type CountyShape } from './geo/usStates.ts';
import { type MapColors } from './style.tsx';
import type { MapLevel, MapPoint, MapRegion } from './types.ts';
export type CountyLoader = (iso: string) => Promise<{
    COUNTIES: CountyShape[];
}>;
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
export declare function UsMap({ level, label, states, counties, onSelect, onCountyShapes, highlight, onHover, focus, points, onSelectPoint, renderTooltip, wrapPoint, onBack, loadCounties, colors, className, style, errorText, }: UsMapProps): import("react").JSX.Element;
