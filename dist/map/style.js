import { jsx as _jsx } from "react/jsx-runtime";
const TOKENS = {
    surface: ['surface', '#ffffff'],
    border: ['border', '#e1e6ea'],
    borderStrong: ['border-strong', '#6b7a85'],
    foreground: ['foreground', '#1a2e3a'],
    foregroundMuted: ['foreground-muted', '#2c4150'],
    accent: ['accent', '#005778'],
    accentSoft: ['accent-soft', '#e8f6fc'],
    focusRing: ['focus-ring', '#005778'],
    danger: ['danger', '#98270e'],
    chart1: ['chart-1', '#0079a8'],
    chart2: ['chart-2', '#a04e00'],
    chart3: ['chart-3', '#6b4de6'],
    chart4: ['chart-4', '#127c0a'],
};
const own = (name) => `--cuix-map-${TOKENS[name][0]}`;
/** The CSS value of one map colour. */
export const mapColor = (name) => `var(${own(name)}, var(--cuix-${TOKENS[name][0]}, ${TOKENS[name][1]}))`;
/** Inline custom properties for the colours a consumer passes. */
export function colorVars(colors, style) {
    const out = {};
    for (const [k, v] of Object.entries(colors ?? {}))
        if (v)
            out[own(k)] = v;
    return { ...out, ...style };
}
const SHAPE_COLOR = {
    circle: 'chart1',
    square: 'chart2',
    triangle: 'chart3',
    diamond: 'chart4',
    cross: 'foregroundMuted',
};
/** One colour per shape: the shape carries the category, the colour repeats it (never colour alone). */
export const shapeColor = (shape, color) => color ?? mapColor(SHAPE_COLOR[shape]);
const c = mapColor;
const FONT_CAPTION = 'var(--cuix-text-caption, 0.8125rem)';
const CSS = `
.cuix-map{position:relative}
.cuix-map>svg{display:block;width:100%;height:auto}
.cuix-map-camera{transition:transform var(--cuix-motion-panel, 400ms) var(--cuix-motion-ease, cubic-bezier(0.2, 0, 0, 1))}
.cuix-map-camera :is(path,circle,polygon){vector-effect:non-scaling-stroke}
.cuix-map-zoomout{cursor:zoom-out}
.cuix-map-faded{opacity:0.4}
.cuix-map-none{fill:${c('surface')};stroke:${c('border')};stroke-width:1}
.cuix-map-tint{stroke:${c('borderStrong')};stroke-width:1}
.cuix-map-solid{fill:${c('accent')};stroke:${c('borderStrong')};stroke-width:1}
.cuix-map-hatch-bg{fill:${c('accentSoft')}}
.cuix-map-hatch-line{stroke:${c('accent')};stroke-width:2}
.cuix-map .cuix-map-hit{cursor:pointer;outline:none}
.cuix-map-hit:hover>.cuix-map-shape{stroke:${c('foreground')};stroke-width:2}
.cuix-map-outline{fill:none;stroke:${c('foregroundMuted')};stroke-width:2;pointer-events:none}
.cuix-map-highlight{fill:none;stroke:${c('foreground')};stroke-width:2;pointer-events:none}
.cuix-map-ring-band{fill:none;stroke:${c('surface')};stroke-width:6;stroke-linejoin:round}
.cuix-map-ring-line{fill:none;stroke:${c('focusRing')};stroke-width:2;stroke-linejoin:round}
.cuix-map-marker{stroke:${c('surface')};stroke-width:1.5;stroke-linejoin:round}
.cuix-map-point:hover .cuix-map-marker,.cuix-street-pin:hover .cuix-map-marker{stroke:${c('foreground')}}
.cuix-map-badge{fill:${c('surface')};stroke-width:2}
.cuix-map-badge-text{fill:${c('foreground')};font-weight:700;pointer-events:none;font-variant-numeric:tabular-nums}
.cuix-map-label{fill:${c('foreground')};stroke:${c('surface')};stroke-width:5;stroke-linejoin:round;paint-order:stroke;pointer-events:none;font-size:var(--cuix-map-label-size, var(--cuix-text-subheading, 1.125rem));font-weight:600}
.cuix-map-label-solid{fill:${c('surface')};stroke:none}
.cuix-map-tip{position:absolute;z-index:var(--cuix-z-tooltip, 50);transform:translate(-50%, calc(-100% - 14px));max-width:16rem;width:max-content;padding:4px 8px;border-radius:var(--cuix-radius-control, 6px);background:${c('foreground')};color:${c('surface')};font-size:${FONT_CAPTION};line-height:1.4}
.cuix-map-error{color:${c('danger')};font-size:${FONT_CAPTION}}
.cuix-layers{border:0;margin:0;padding:0;min-width:0}
.cuix-layers-title{padding:0;margin-bottom:4px;font-weight:600}
.cuix-layer{display:flex;align-items:center;gap:8px;width:100%;min-height:var(--cuix-target-min, 44px);padding:0 4px;border:0;border-radius:var(--cuix-radius-control, 6px);background:none;color:inherit;font:inherit;text-align:start;cursor:pointer}
.cuix-layer[aria-disabled=true]{cursor:not-allowed}
.cuix-layer[aria-disabled=true] .cuix-layer-label{color:${c('foregroundMuted')}}
.cuix-layer-track{flex:none;position:relative;box-sizing:border-box;width:36px;height:20px;border:2px solid ${c('borderStrong')};border-radius:999px;background:${c('surface')}}
.cuix-layer-thumb{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:${c('borderStrong')};transition:transform var(--cuix-motion-fast, 150ms)}
.cuix-layer[aria-checked=true] .cuix-layer-track{border-color:${c('accent')};background:${c('accent')}}
.cuix-layer[aria-checked=true] .cuix-layer-thumb{transform:translateX(16px);background:${c('surface')}}
.cuix-layer-label{flex:1}
.cuix-layer-count{font-variant-numeric:tabular-nums;color:${c('foregroundMuted')}}
.cuix-layer-hint{color:${c('foregroundMuted')};font-size:${FONT_CAPTION}}
.cuix-street{position:relative}
.cuix-street>.cuix-street-canvas{position:absolute;inset:0}
.cuix-street-pin{display:grid;place-items:center;width:var(--cuix-target-min, 44px);height:var(--cuix-target-min, 44px);padding:0;border:0;border-radius:50%;background:none;cursor:pointer}
.cuix-street-pin>svg{width:16px;height:16px;overflow:visible}
.cuix-map-focus:focus-visible{outline:2px solid ${c('focusRing')};outline-offset:2px}
@media (prefers-reduced-motion: reduce){.cuix-map-camera,.cuix-layer-thumb{transition:none}}
@media (forced-colors: active){
.cuix-map-ring-line{stroke:Highlight}
.cuix-map-tip{border:1px solid CanvasText}
.cuix-layer-track{border-color:CanvasText}
.cuix-layer-thumb{background:CanvasText}
.cuix-layer[aria-checked=true] .cuix-layer-track{border-color:Highlight}
.cuix-layer[aria-checked=true] .cuix-layer-thumb{background:Highlight}
}
`;
/** The subpath's one stylesheet. React 19 hoists it to <head> once, however many maps mount. */
export function MapStyle() {
    return (_jsx("style", { href: "cuix-map", precedence: "default", children: CSS }));
}
