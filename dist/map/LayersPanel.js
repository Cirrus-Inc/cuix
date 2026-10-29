'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { MarkerSwatch } from "./Marker.js";
import { MapStyle, colorVars } from "./style.js";
// One switch per layer: track, the layer's marker swatch (shape and colour, so
// never colour alone), label, count, hint. The whole row is the 44px target and
// the accessible name. A disabled layer stays focusable (aria-disabled), so its
// hint ("Later") is discoverable.
export function LayersPanel({ layers, value, onChange, title = 'Layers', colors, className, style }) {
    const titleId = useId();
    return (_jsxs("div", { role: "group", "aria-labelledby": titleId, className: className ? `cuix-layers ${className}` : 'cuix-layers', style: colorVars(colors, style), children: [_jsx(MapStyle, {}), _jsx("div", { id: titleId, className: "cuix-layers-title", children: title }), layers.map((layer) => {
                const on = !layer.disabled && value[layer.id] === true;
                return (_jsxs("button", { type: "button", role: "switch", "aria-checked": on, "aria-disabled": layer.disabled || undefined, onClick: () => {
                        if (!layer.disabled)
                            onChange(layer.id, !on);
                    }, className: "cuix-layer cuix-map-focus", children: [_jsx("span", { "aria-hidden": true, className: "cuix-layer-track", children: _jsx("span", { className: "cuix-layer-thumb" }) }), _jsx(MarkerSwatch, { shape: layer.shape, color: layer.color }), _jsx("span", { className: "cuix-layer-label", children: layer.label }), layer.hint && _jsx("span", { className: "cuix-layer-hint", children: layer.hint }), layer.count !== undefined && _jsx("span", { className: "cuix-layer-count", children: layer.count })] }, layer.id));
            })] }));
}
