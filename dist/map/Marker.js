import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { shapePoints } from "./mapMath.js";
import { MapStyle, shapeColor } from "./style.js";
/** One marker shape centred on (x, y). The swatches draw exactly the same thing. */
export function Marker({ shape = 'circle', x, y, r, color }) {
    const style = { fill: shapeColor(shape, color) };
    const points = shapePoints(shape, x, y, r);
    return points ? (_jsx("polygon", { points: points, style: style, className: "cuix-map-marker" })) : (_jsx("circle", { cx: x, cy: y, r: r, style: style, className: "cuix-map-marker" }));
}
/** A marker for a legend or a layer row, 12px by default. */
export function MarkerSwatch({ shape = 'circle', color, size = 12 }) {
    return (_jsxs(_Fragment, { children: [_jsx(MapStyle, {}), _jsx("svg", { "aria-hidden": true, viewBox: "0 0 12 12", width: size, height: size, style: { flex: 'none', overflow: 'visible' }, children: _jsx(Marker, { shape: shape, x: 6, y: 6, r: 4.5, color: color }) })] }));
}
/**
 * The hatch of the "tint" bucket. `k` is the camera scale: the pattern lives in
 * the zoomed group, so it is shrunk by 1/k to keep the hatch 6px at every level.
 */
export function Hatch({ id, k = 1 }) {
    return (_jsxs("pattern", { id: id, width: "6", height: "6", patternUnits: "userSpaceOnUse", patternTransform: `rotate(45) scale(${String(1 / k)})`, children: [_jsx("rect", { width: "6", height: "6", className: "cuix-map-hatch-bg" }), _jsx("line", { x1: "0", y1: "0", x2: "0", y2: "6", className: "cuix-map-hatch-line" })] }));
}
/** A region bucket for a legend: the same fill, hatch or outline UsMap draws. */
export function MapSwatch({ bucket }) {
    const id = useId();
    return (_jsxs(_Fragment, { children: [_jsx(MapStyle, {}), _jsxs("svg", { "aria-hidden": true, viewBox: "0 0 24 16", width: 24, height: 16, style: { flex: 'none' }, children: [_jsx("defs", { children: _jsx(Hatch, { id: id }) }), _jsx("rect", { x: "1", y: "1", width: "22", height: "14", rx: "2", fill: bucket === 'tint' ? `url(#${id})` : undefined, className: `cuix-map-${bucket}` })] })] }));
}
