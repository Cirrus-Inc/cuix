import type { CSSProperties } from 'react';
import { mapColor, isMapColor, type MapColors } from './colors.ts';
import type { MarkerShape } from './types.ts';
export { mapColor, isMapColor, type MapColors };
/** Inline custom properties for the colours a consumer passes. */
export declare function colorVars(colors: Partial<MapColors> | undefined, style?: CSSProperties): CSSProperties;
/** One colour per shape: the shape carries the category, the colour repeats it (never colour alone). */
export declare const shapeColor: (shape: MarkerShape, color?: string) => string;
/** The subpath's one stylesheet. React 19 hoists it to <head> once, however many maps mount. */
export declare function MapStyle(): import("react").JSX.Element;
