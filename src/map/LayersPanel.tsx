'use client';

import { useId, type CSSProperties } from 'react';
import { MarkerSwatch } from './Marker.tsx';
import { MapStyle, colorVars, type MapColors } from './style.tsx';
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

// One switch per layer: track, the layer's marker swatch (shape and colour, so
// never colour alone), label, count, hint. The whole row is the 44px target and
// the accessible name. A disabled layer stays focusable (aria-disabled), so its
// hint ("Later") is discoverable.
export function LayersPanel({ layers, value, onChange, title = 'Layers', colors, className, style }: LayersPanelProps) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className={className ? `cuix-layers ${className}` : 'cuix-layers'} style={colorVars(colors, style)}>
      <MapStyle />
      <div id={titleId} className="cuix-layers-title">
        {title}
      </div>
      {layers.map((layer) => {
        const on = !layer.disabled && value[layer.id] === true;
        return (
          <button
            key={layer.id}
            type="button"
            role="switch"
            aria-checked={on}
            aria-disabled={layer.disabled || undefined}
            onClick={() => {
              if (!layer.disabled) onChange(layer.id, !on);
            }}
            className="cuix-layer cuix-map-focus"
          >
            <span aria-hidden className="cuix-layer-track">
              <span className="cuix-layer-thumb" />
            </span>
            <MarkerSwatch shape={layer.shape} color={layer.color} />
            <span className="cuix-layer-label">{layer.label}</span>
            {layer.hint && <span className="cuix-layer-hint">{layer.hint}</span>}
            {layer.count !== undefined && <span className="cuix-layer-count">{layer.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
