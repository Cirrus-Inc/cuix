'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState, } from 'react';
import { COUNTY_LOADERS } from "./geo/countyLoaders.js";
import { US_STATES, VIEWBOX } from "./geo/usStates.js";
import { COUNTY_PAD, IDENTITY, ZOOM_MAX, ZOOM_MIN, cameraFor, cameraTransform, clampZoom, intersects, pathBBox, stepZoom, visibleRect, zoomCamera, } from "./mapMath.js";
import { Hatch, Marker } from "./Marker.js";
import { MapStyle, colorVars, shapeColor } from "./style.js";
// A generic US map (HIVE ADR-0012 §6): regions and a level, nothing about what
// they mean. Geometry is generated (scripts/gen-us-map.mjs); county files load on
// demand, one chunk per state, so the US level downloads none.
const [, , VIEW_W, VIEW_H] = VIEWBOX.split(' ').map(Number);
const VIEW = { width: VIEW_W, height: VIEW_H };
const defaultLoader = (iso) => {
    const load = COUNTY_LOADERS[iso];
    return load ? load() : Promise.reject(new Error(`no county file for ${iso}`));
};
function useCounties(iso, loader) {
    const [state, setState] = useState({ status: 'loading' });
    const load = useRef(loader);
    load.current = loader;
    useEffect(() => {
        if (!iso)
            return;
        let live = true;
        setState({ status: 'loading' });
        load.current(iso).then((m) => live && setState({ status: 'ok', iso, shapes: m.COUNTIES }), () => live && setState({ status: 'error' }));
        return () => {
            live = false;
        };
    }, [iso]);
    return state;
}
const ZOOM_LABELS = { group: 'Zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit' };
const activate = (e, run) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        run();
    }
};
const badgeText = (n) => (n > 99 ? '99+' : String(n));
export function UsMap({ level, label, states, counties = [], onSelect, onCountyShapes, highlight, onHover, focus, points, onSelectPoint, renderTooltip, wrapPoint, onBack, loadCounties = defaultLoader, colors, className, style, errorText = 'Could not load the county shapes.', zoom: zoomProp, onZoomChange, zoomControls = true, zoomLabels, countyOutline = 'hairline', }) {
    const hatch = useId();
    const tipId = useId();
    const iso = level.kind === 'state' ? level.iso : null;
    const geo = useCounties(iso, loadCounties);
    const stateShape = iso ? US_STATES.find((s) => s.iso === iso) : undefined;
    const shapes = geo.status === 'ok' && geo.iso === iso ? geo.shapes : null;
    const focused = focus && shapes ? shapes.find((c) => c.fips === focus) : undefined;
    const fit = useMemo(() => (focused ? cameraFor(pathBBox(focused.d), VIEW, COUNTY_PAD) : stateShape ? cameraFor(pathBBox(stateShape.d), VIEW) : IDENTITY), [focused, stateShape]);
    // Uncontrolled zoom starts over at every new fit; a controlled one is the app's.
    const fitKey = `${iso ?? ''}|${focused?.fips ?? ''}`;
    const [ownZoom, setOwnZoom] = useState({ key: fitKey, zoom: ZOOM_MIN });
    if (ownZoom.key !== fitKey)
        setOwnZoom({ key: fitKey, zoom: ZOOM_MIN });
    const zoom = iso ? clampZoom(zoomProp ?? (ownZoom.key === fitKey ? ownZoom.zoom : ZOOM_MIN)) : ZOOM_MIN;
    const setZoom = (next) => {
        if (zoomProp === undefined)
            setOwnZoom({ key: fitKey, zoom: next });
        onZoomChange?.(next);
    };
    const camera = useMemo(() => (zoom === ZOOM_MIN ? fit : zoomCamera(fit, zoom, VIEW)), [fit, zoom]);
    const text = { ...ZOOM_LABELS, ...zoomLabels };
    const boxes = useMemo(() => (shapes ? new Map(shapes.map((c) => [c.fips, pathBBox(c.d)])) : null), [shapes]);
    // At county focus or zoomed in, part of the state is off-screen: still clickable, out of the tab order.
    const view = focused || zoom > ZOOM_MIN ? visibleRect(camera, VIEW) : null;
    const offscreen = (box) => (view && box && !intersects(view, box) ? -1 : 0);
    // A ref, so an inline callback that sets the page's state reports once per file.
    const reportShapes = useRef(onCountyShapes);
    reportShapes.current = onCountyShapes;
    useEffect(() => {
        reportShapes.current?.(shapes ? shapes.map((c) => ({ fips: c.fips, name: c.name })) : null);
    }, [shapes]);
    const stateRegions = new Map(states.map((r) => [r.fips, r]));
    const countyRegions = new Map(counties.map((r) => [r.fips, r]));
    const [ring, setRing] = useState(null);
    const ringOn = (e, kind, id) => {
        if (e.currentTarget.matches(':focus-visible'))
            setRing({ kind, id, iso });
    };
    const ringOff = () => setRing(null);
    // Keyed by level: a shape that unmounts while focused never fires its blur.
    const live = ring && ring.iso === iso ? ring : null;
    const ringD = live?.kind === 'state' ? US_STATES.find((s) => s.fips === live.id)?.d : live?.kind === 'county' ? shapes?.find((c) => c.fips === live.id)?.d : undefined;
    const ringPoint = live?.kind === 'point' && shapes ? points?.find((p) => p.id === live.id) : undefined;
    // The built-in tooltip: on hover or focus, kept while the pointer moves onto it (1.4.13), Esc hides it.
    const [tip, setTip] = useState(null);
    const tipTimer = useRef(undefined);
    const showTip = (id) => {
        clearTimeout(tipTimer.current);
        setTip(id);
    };
    const hideTip = (delay = 0) => {
        clearTimeout(tipTimer.current);
        if (delay)
            tipTimer.current = setTimeout(() => setTip(null), delay);
        else
            setTip(null);
    };
    useEffect(() => () => clearTimeout(tipTimer.current), []);
    const tipPoint = !wrapPoint && tip && shapes ? points?.find((p) => p.id === tip) : undefined;
    // The bubble stays open while the pointer is on it (1.4.13 hoverable). Listeners, not
    // JSX handlers: the bubble is not a control, and jsx-a11y would ask for a role.
    const tipBox = useRef(null);
    const shownId = tipPoint?.id;
    useEffect(() => {
        const el = tipBox.current;
        if (!el || !shownId)
            return;
        const enter = () => clearTimeout(tipTimer.current);
        const leave = () => setTip(null);
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
        return () => {
            el.removeEventListener('mouseenter', enter);
            el.removeEventListener('mouseleave', leave);
        };
    }, [shownId]);
    const fillAttr = (r) => (r.shade ? r.shade : r.bucket === 'tint' ? `url(#${hatch})` : undefined);
    const shapeClass = (r) => `cuix-map-shape cuix-map-${r.shade ? 'shade' : r.bucket}`;
    const sorted = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));
    const k = camera.k;
    const point = (p) => {
        const n = p.count ?? 1;
        const marker = (_jsxs("g", { role: "button", tabIndex: offscreen({ x: p.x, y: p.y, width: 0, height: 0 }), "aria-label": p.name, "aria-describedby": tipPoint?.id === p.id ? tipId : undefined, onClick: () => onSelectPoint?.(p.id), onKeyDown: (e) => {
                if (e.key === 'Escape')
                    hideTip();
                activate(e, () => onSelectPoint?.(p.id));
            }, onFocus: (e) => {
                ringOn(e, 'point', p.id);
                showTip(p.id);
            }, onBlur: () => {
                ringOff();
                hideTip();
            }, onMouseEnter: () => showTip(p.id), onMouseLeave: () => hideTip(150), className: "cuix-map-hit cuix-map-point", children: [_jsx("circle", { "aria-hidden": true, cx: p.x, cy: p.y, r: (n > 1 ? 16 : 12) / k, fill: "none", pointerEvents: "none" }), n > 1 ? (_jsxs(_Fragment, { children: [_jsx("circle", { cx: p.x, cy: p.y, r: 11 / k, className: "cuix-map-badge", style: { stroke: shapeColor(p.shape ?? 'circle', p.color) } }), _jsx("text", { x: p.x, y: p.y, textAnchor: "middle", dominantBaseline: "central", className: "cuix-map-badge-text", style: { fontSize: `${String(12 / k)}px` }, children: badgeText(n) })] })) : (_jsx(Marker, { shape: p.shape, x: p.x, y: p.y, r: 5 / k, color: p.color }))] }, p.id));
        return wrapPoint ? _jsx("g", { children: wrapPoint(p, marker) }, p.id) : marker;
    };
    return (_jsxs("div", { className: className ? `cuix-map ${className}` : 'cuix-map', style: colorVars(colors, style), children: [_jsx(MapStyle, {}), iso && zoomControls && (_jsxs("div", { role: "group", "aria-label": text.group, className: "cuix-map-zoom", children: [_jsx("button", { type: "button", "aria-label": text.zoomIn, "aria-disabled": zoom >= ZOOM_MAX || undefined, onClick: () => zoom < ZOOM_MAX && setZoom(stepZoom(zoom, 1)), className: "cuix-map-zoom-btn cuix-map-focus", children: _jsx("span", { "aria-hidden": true, children: "+" }) }), _jsx("button", { type: "button", "aria-label": text.zoomOut, "aria-disabled": zoom <= ZOOM_MIN || undefined, onClick: () => zoom > ZOOM_MIN && setZoom(stepZoom(zoom, -1)), className: "cuix-map-zoom-btn cuix-map-focus", children: _jsx("span", { "aria-hidden": true, children: "\u2212" }) }), _jsx("button", { type: "button", "aria-disabled": zoom <= ZOOM_MIN || undefined, onClick: () => zoom > ZOOM_MIN && setZoom(ZOOM_MIN), className: "cuix-map-zoom-btn cuix-map-zoom-fit cuix-map-focus", children: text.fit })] })), _jsxs("svg", { viewBox: VIEWBOX, role: "group", "aria-label": label, onClick: iso && onBack
                    ? (e) => {
                        // detail > 1: the second click of a double-click on a state, which landed after the zoom in.
                        if (e.button !== 0 || e.detail > 1 || e.target.closest('a, [role="button"]'))
                            return;
                        onBack();
                    }
                    : undefined, className: iso && onBack ? 'cuix-map-zoomout' : undefined, children: [_jsx("defs", { children: _jsx(Hatch, { id: hatch, k: k }) }), _jsxs("g", { style: { transform: cameraTransform(camera), transformOrigin: '0 0' }, className: "cuix-map-camera", children: [_jsx("g", { "aria-hidden": true, className: iso ? 'cuix-map-faded' : undefined, children: US_STATES.filter((s) => (iso === null ? !stateRegions.has(s.fips) : s.iso !== iso)).map((s) => (_jsx("path", { d: s.d, className: "cuix-map-none" }, s.fips))) }), iso === null &&
                                sorted(states).map((r) => {
                                    const s = US_STATES.find((x) => x.fips === r.fips);
                                    if (!s)
                                        return null;
                                    const click = (e) => {
                                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                                            return;
                                        e.preventDefault();
                                        onSelect('state', s.iso);
                                    };
                                    return (
                                    // An SVG <a> without href is neither focusable nor a link, so a state without one is a button.
                                    _jsxs("a", { href: r.href, role: r.href ? undefined : 'button', tabIndex: r.href ? undefined : 0, onKeyDown: r.href ? undefined : (e) => activate(e, () => onSelect('state', s.iso)), "aria-label": r.name, onClick: click, onFocus: (e) => ringOn(e, 'state', r.fips), onBlur: ringOff, className: "cuix-map-hit", children: [_jsx("path", { d: s.d, fill: fillAttr(r), className: shapeClass(r) }), r.detail && _jsx("title", { children: r.detail })] }, r.fips));
                                }), stateShape && shapes && (_jsxs("g", { className: countyOutline === 'bold' ? 'cuix-map-counties-bold' : undefined, children: [_jsx("g", { "aria-hidden": true, children: shapes
                                            .filter((c) => !countyRegions.has(c.fips))
                                            .map((c) => (_jsx("path", { d: c.d, className: "cuix-map-none" }, c.fips))) }), sorted(counties).flatMap((r) => {
                                        const c = shapes.find((x) => x.fips === r.fips);
                                        if (!c)
                                            return [];
                                        return [
                                            _jsxs("g", { role: "button", tabIndex: offscreen(boxes?.get(r.fips)), "aria-label": r.name, onClick: () => onSelect('county', r.fips), onKeyDown: (e) => activate(e, () => onSelect('county', r.fips)), onMouseEnter: () => onHover?.(r.fips), onMouseLeave: () => onHover?.(null), onFocus: (e) => {
                                                    onHover?.(r.fips);
                                                    ringOn(e, 'county', r.fips);
                                                }, onBlur: () => {
                                                    onHover?.(null);
                                                    ringOff();
                                                }, className: "cuix-map-hit", children: [_jsx("path", { d: c.d, fill: fillAttr(r), className: shapeClass(r) }), r.detail && _jsx("title", { children: r.detail })] }, r.fips),
                                        ];
                                    }), highlight && countyRegions.has(highlight) && (_jsx("path", { "aria-hidden": true, d: shapes.find((x) => x.fips === highlight)?.d, className: "cuix-map-highlight" })), _jsx("g", { "aria-hidden": true, children: counties.map((r) => {
                                            const c = r.label ? shapes.find((x) => x.fips === r.fips) : undefined;
                                            if (!c)
                                                return null;
                                            const solid = r.bucket === 'solid' && !r.shade;
                                            return (_jsx("text", { x: c.cx, y: c.cy, textAnchor: "middle", dominantBaseline: "central", 
                                                // On a filled county the text knocks out of the fill; elsewhere it is haloed.
                                                style: { fontSize: `${String(16 / k)}px`, strokeWidth: 4 / k }, className: solid ? 'cuix-map-label cuix-map-label-solid' : 'cuix-map-label', children: r.label }, r.fips));
                                        }) })] })), stateShape && _jsx("path", { "aria-hidden": true, d: stateShape.d, className: "cuix-map-outline" }), ringD && (_jsxs("g", { "aria-hidden": true, pointerEvents: "none", children: [_jsx("path", { d: ringD, className: "cuix-map-ring-band" }), _jsx("path", { d: ringD, className: "cuix-map-ring-line" })] })), stateShape && shapes && points && [...points].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(point), ringPoint && (_jsxs("g", { "aria-hidden": true, pointerEvents: "none", children: [_jsx("circle", { cx: ringPoint.x, cy: ringPoint.y, r: ((ringPoint.count ?? 1) > 1 ? 15 : 9) / k, className: "cuix-map-ring-band" }), _jsx("circle", { cx: ringPoint.x, cy: ringPoint.y, r: ((ringPoint.count ?? 1) > 1 ? 15 : 9) / k, className: "cuix-map-ring-line" })] }))] }), iso === null && (_jsx("g", { "aria-hidden": true, children: states.map((r) => {
                            const s = US_STATES.find((x) => x.fips === r.fips);
                            if (!s || !r.label)
                                return null;
                            return (_jsx("text", { x: s.cx, y: s.cy, textAnchor: "middle", dominantBaseline: "central", className: "cuix-map-label", children: r.label }, r.fips));
                        }) }))] }), tipPoint && (_jsx("div", { className: "cuix-map-tip", style: {
                    left: `${String(((camera.x + tipPoint.x * k) / VIEW_W) * 100)}%`,
                    top: `${String(((camera.y + tipPoint.y * k) / VIEW_H) * 100)}%`,
                }, ref: tipBox, children: _jsx("div", { id: tipId, role: "tooltip", children: renderTooltip ? (renderTooltip(tipPoint)) : (_jsxs(_Fragment, { children: [_jsxs("span", { "aria-hidden": true, children: [tipPoint.name, tipPoint.detail ? ' · ' : ''] }), tipPoint.detail && _jsx("span", { children: tipPoint.detail })] })) }) })), iso !== null && geo.status === 'error' && (_jsx("p", { role: "alert", className: "cuix-map-error", children: errorText }))] }));
}
