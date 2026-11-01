import type { CSSProperties } from 'react';
import type { MarkerShape } from './types.ts';
export interface MapColors {
    surface: string;
    border: string;
    borderStrong: string;
    foreground: string;
    foregroundMuted: string;
    accent: string;
    accentSoft: string;
    focusRing: string;
    danger: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
}
/** The CSS value of one map colour. */
export declare const mapColor: (name: keyof MapColors) => string;
/** Inline custom properties for the colours a consumer passes. */
export declare function colorVars(colors: Partial<MapColors> | undefined, style?: CSSProperties): CSSProperties;
/** One colour per shape: the shape carries the category, the colour repeats it (never colour alone). */
export declare const shapeColor: (shape: MarkerShape, color?: string) => string;
/** The subpath's one stylesheet. React 19 hoists it to <head> once, however many maps mount. */
export declare function MapStyle(): import("react").JSX.Element;
