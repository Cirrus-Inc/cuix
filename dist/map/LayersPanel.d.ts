import { type CSSProperties } from 'react';
import { type MapColors } from './style.tsx';
import type { MapLayer } from './types.ts';
export interface LayersPanelProps {
    layers: readonly MapLayer[];
    /** Which layers are on, by id. The consumer owns this state. */
    value: Readonly<Record<string, boolean>>;
    onChange: (id: string, on: boolean) => void;
    /** The group's visible name. */
    title?: string;
    colors?: Partial<MapColors>;
    className?: string;
    style?: CSSProperties;
}
export declare function LayersPanel({ layers, value, onChange, title, colors, className, style }: LayersPanelProps): import("react").JSX.Element;
