'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState, } from 'react';
import { COUNTY_LOADERS } from "./geo/countyLoaders.js";
import { US_STATES, VIEWBOX } from "./geo/usStates.js";
import { COUNTY_PAD, IDENTITY, ZERO, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, cameraFor, cameraTransform, clampShift, clampZoom, clientToView, intersects, isDrag, panBy, pathBBox, screenRect, stepZoom, viewCamera, visibleRect, wheelZoomFactor, zoomAbout, } from "./mapMath.js";
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
/** A click that does not become a double-click within this long steps back (`onBack`). */
const DBLCLICK_MS = 250;
/** One arrow key pans this fraction of the view. */
const KEY_PAN = 0.2;
const activate = (e, run) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        run();
    }
};
const badgeText = (n) => (n > 99 ? '99+' : String(n));
export function UsMap({ level, label, states, counties = [], onSelect, onCountyShapes, highlight, selected, onHover, focus, points, onSelectPoint, renderTooltip, wrapPoint, onBack, loadCounties = defaultLoader, colors, className, style, errorText = 'Could not load the county shapes.', zoom: zoomProp, onZoomChange, zoomControls = true, zoomLabels, countyOutline = 'hairline', gestures = true, wheelZoom = 'plain', onSelectedBounds, onMapClick, overlay, }) {
    const hatch = useId();
    const tipId = useId();
    const iso = level.kind === 'state' ? level.iso : null;
    const geo = useCounties(iso, loadCounties);
    const stateShape = iso ? US_STATES.find((s) => s.iso === iso) : undefined;
    const shapes = geo.status === 'ok' && geo.iso === iso ? geo.shapes : null;
    const focused = focus && shapes ? shapes.find((c) => c.fips === focus) : undefined;
    const fit = useMemo(() => (focused ? cameraFor(pathBBox(focused.d), VIEW, COUNTY_PAD) : stateShape ? cameraFor(pathBBox(stateShape.d), VIEW) : IDENTITY), [focused, stateShape]);
    // Uncontrolled zoom and the pan start over at every new fit; a controlled zoom is the app's.
    const fitKey = `${iso ?? ''}|${focused?.fips ?? ''}`;
    const [ownState, setOwn] = useState({ key: fitKey, zoom: ZOOM_MIN, shift: ZERO });
    if (ownState.key !== fitKey)
        setOwn({ key: fitKey, zoom: ZOOM_MIN, shift: ZERO });
    const own = ownState.key === fitKey ? ownState : { key: fitKey, zoom: ZOOM_MIN, shift: ZERO };
    const zoom = iso ? clampZoom(zoomProp ?? own.zoom) : ZOOM_MIN;
    // The pan lives only while zoomed in, and is clamped on every render: a zoom set from outside can break it.
    if (zoom <= ZOOM_MIN && own.shift !== ZERO)
        setOwn({ ...own, shift: ZERO });
    const stateBox = useMemo(() => (stateShape ? pathBBox(stateShape.d) : null), [stateShape]);
    const shift = zoom > ZOOM_MIN && stateBox ? clampShift(fit, zoom, own.shift, stateBox, VIEW) : ZERO;
    const camera = useMemo(() => (zoom === ZOOM_MIN ? fit : viewCamera(fit, zoom, shift, VIEW)), [fit, zoom, shift]);
    const cur = useRef({ zoom, shift, fit, stateBox, fitKey, zoomProp });
    cur.current = { zoom, shift, fit, stateBox, fitKey, zoomProp };
    const onZoomRef = useRef(onZoomChange);
    onZoomRef.current = onZoomChange;
    // Every zoom or pan goes through here; handlers read `cur` so two events before a render still add up.
    const commit = (nextZoom, nextShift) => {
        const c = cur.current;
        const z = clampZoom(nextZoom);
        const u = z <= ZOOM_MIN || !c.stateBox ? ZERO : clampShift(c.fit, z, nextShift, c.stateBox, VIEW);
        cur.current = { ...c, zoom: z, shift: u };
        const key = c.fitKey;
        setOwn((o) => ({ key, zoom: c.zoomProp === undefined ? z : o.zoom, shift: u }));
        if (z !== c.zoom)
            onZoomRef.current?.(z);
    };
    const zoomBy = (factor, p) => {
        const c = cur.current;
        const r = zoomAbout(c.fit, c.zoom, c.shift, factor, p, VIEW);
        commit(r.zoom, r.shift);
    };
    const setZoom = (next) => zoomBy(next / cur.current.zoom, { x: VIEW_W / 2, y: VIEW_H / 2 });
    const gesturesOn = gestures && iso !== null;
    const pin = iso !== null && !!onMapClick;
    const onMapClickRef = useRef(onMapClick);
    onMapClickRef.current = onMapClick;
    const svgRef = useRef(null);
    const toView = (cx, cy) => clientToView(svgRef.current.getBoundingClientRect(), VIEW, cx, cy);
    // While a gesture runs the camera follows it at once; buttons and keys keep the eased transition.
    const [snap, setSnap] = useState(false);
    const liveTimer = useRef(undefined);
    const g = useRef({ pointers: new Map(), start: { x: 0, y: 0 }, moved: false, active: false, suppress: false });
    const [dragging, setDragging] = useState(false);
    const backTimer = useRef(undefined);
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;
    useEffect(() => () => {
        clearTimeout(liveTimer.current);
        clearTimeout(backTimer.current);
    }, []);
    // A native, non-passive listener: React's onWheel is passive, so it cannot stop the page scrolling.
    const wheelRef = useRef(() => { });
    wheelRef.current = (e) => {
        if (wheelZoom === 'modifier' && !e.ctrlKey && !e.metaKey)
            return;
        e.preventDefault();
        clearTimeout(liveTimer.current);
        setSnap(true);
        liveTimer.current = setTimeout(() => setSnap(false), 150);
        zoomBy(wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey), toView(e.clientX, e.clientY));
    };
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || !gesturesOn)
            return;
        const on = (e) => wheelRef.current(e);
        svg.addEventListener('wheel', on, { passive: false });
        return () => svg.removeEventListener('wheel', on);
    }, [gesturesOn]);
    const beginDrag = (e) => {
        const d = g.current;
        if (!d.moved) {
            d.moved = true;
            d.active = true;
            setDragging(true);
            hideTip();
            onHover?.(null);
        }
        // Captured only once it is a drag: capturing on press would retarget the click of a plain press.
        for (const id of d.pointers.keys()) {
            try {
                e.currentTarget.setPointerCapture(id);
            }
            catch {
                // the pointer is already gone
            }
        }
    };
    const pointerDown = (e) => {
        const d = g.current;
        if (!gesturesOn || (e.pointerType === 'mouse' && e.button !== 0))
            return;
        if (d.pointers.size === 0) {
            d.start = { x: e.clientX, y: e.clientY };
            d.moved = false;
            d.suppress = false;
        }
        d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (d.pointers.size === 2)
            beginDrag(e);
    };
    const pointerMove = (e) => {
        const d = g.current;
        const prev = d.pointers.get(e.pointerId);
        if (!prev)
            return;
        const now = { x: e.clientX, y: e.clientY };
        d.pointers.set(e.pointerId, now);
        if (d.pointers.size === 1) {
            if (!d.moved && !isDrag(now.x - d.start.x, now.y - d.start.y))
                return;
            const from = d.moved ? prev : d.start;
            beginDrag(e);
            const a = toView(from.x, from.y);
            const b = toView(now.x, now.y);
            const c = cur.current;
            commit(c.zoom, panBy(c.shift, b.x - a.x, b.y - a.y, c.zoom));
        }
        else if (d.pointers.size === 2) {
            const [other] = [...d.pointers].filter(([id]) => id !== e.pointerId);
            if (!other)
                return;
            const o = other[1];
            const before = { mx: (prev.x + o.x) / 2, my: (prev.y + o.y) / 2, dist: Math.hypot(prev.x - o.x, prev.y - o.y) };
            const after = { mx: (now.x + o.x) / 2, my: (now.y + o.y) / 2, dist: Math.hypot(now.x - o.x, now.y - o.y) };
            const p0 = toView(before.mx, before.my);
            const p1 = toView(after.mx, after.my);
            const c = cur.current;
            const r = zoomAbout(c.fit, c.zoom, c.shift, before.dist > 0 ? after.dist / before.dist : 1, p0, VIEW);
            commit(r.zoom, panBy(r.shift, p1.x - p0.x, p1.y - p0.y, r.zoom));
        }
    };
    const pointerUp = (e) => {
        const d = g.current;
        if (!d.pointers.delete(e.pointerId))
            return;
        if (d.pointers.size > 0)
            return;
        // The click that follows a drag is the drag's own release: swallowed in onClickCapture.
        d.suppress = d.moved;
        d.active = false;
        setDragging(false);
    };
    const onKey = (e) => {
        // Only the map itself: a focused county or marker keeps its own keys.
        if (!gesturesOn || e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey)
            return;
        const c = cur.current;
        const pan = (dx, dy) => {
            if (c.zoom <= ZOOM_MIN)
                return;
            e.preventDefault();
            commit(c.zoom, panBy(c.shift, dx * VIEW_W * KEY_PAN, dy * VIEW_H * KEY_PAN, c.zoom));
        };
        if (e.key === 'ArrowLeft')
            pan(1, 0);
        else if (e.key === 'ArrowRight')
            pan(-1, 0);
        else if (e.key === 'ArrowUp')
            pan(0, 1);
        else if (e.key === 'ArrowDown')
            pan(0, -1);
        else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            if (c.zoom < ZOOM_MAX)
                setZoom(stepZoom(c.zoom, 1));
        }
        else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            if (c.zoom > ZOOM_MIN)
                setZoom(stepZoom(c.zoom, -1));
        }
    };
    // The selected county's box on screen, from the camera it is heading to (not the transition's frame).
    const selBoxD = selected && stateShape && counties.some((r) => r.fips === selected) ? shapes?.find((c) => c.fips === selected)?.d : undefined;
    const selBox = useMemo(() => (selBoxD ? pathBBox(selBoxD) : null), [selBoxD]);
    const wantsBounds = !!onSelectedBounds;
    const boundsRef = useRef(onSelectedBounds);
    boundsRef.current = onSelectedBounds;
    useEffect(() => {
        const svg = svgRef.current;
        if (!wantsBounds || !svg)
            return;
        let last = '';
        const emit = () => {
            const r = selBox ? screenRect(selBox, camera, svg.getBoundingClientRect(), VIEW) : null;
            const key = r ? `${String(r.x)},${String(r.y)},${String(r.width)},${String(r.height)}` : 'none';
            if (key === last)
                return;
            last = key;
            boundsRef.current?.(r ? new DOMRect(r.x, r.y, r.width, r.height) : null);
        };
        emit();
        const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(emit);
        ro?.observe(svg);
        window.addEventListener('scroll', emit, { capture: true, passive: true });
        window.addEventListener('resize', emit);
        return () => {
            ro?.disconnect();
            window.removeEventListener('scroll', emit, { capture: true });
            window.removeEventListener('resize', emit);
        };
    }, [wantsBounds, selBox, camera]);
    const text = { ...ZOOM_LABELS, ...zoomLabels };
    const boxes = useMemo(() => (shapes ? new Map(shapes.map((c) => [c.fips, pathBBox(c.d)])) : null), [shapes]);
    // At county focus or zoomed in, part of the state is off-screen: still clickable, out of the tab order.
    const view = focused || zoom > ZOOM_MIN ? visibleRect(camera, VIEW) : null;
    const pinAt = (box) => box && onMapClick?.({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
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
    const selectedD = selected && stateShape && countyRegions.has(selected) ? shapes?.find((c) => c.fips === selected)?.d : undefined;
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
        const marker = (_jsxs("g", { role: "button", tabIndex: offscreen({ x: p.x, y: p.y, width: 0, height: 0 }), "aria-label": p.name, "aria-describedby": tipPoint?.id === p.id ? tipId : undefined, onClick: pin ? undefined : (e) => e.detail <= 1 && onSelectPoint?.(p.id), onKeyDown: (e) => {
                if (e.key === 'Escape')
                    hideTip();
                activate(e, () => (pin ? onMapClick?.({ x: p.x, y: p.y }) : onSelectPoint?.(p.id)));
            }, onFocus: (e) => {
                ringOn(e, 'point', p.id);
                showTip(p.id);
            }, onBlur: () => {
                ringOff();
                hideTip();
            }, onMouseEnter: () => !g.current.active && showTip(p.id), onMouseLeave: () => hideTip(150), className: "cuix-map-hit cuix-map-point", children: [_jsx("circle", { "aria-hidden": true, cx: p.x, cy: p.y, r: (n > 1 ? 16 : 12) / k, fill: "none", pointerEvents: "none" }), n > 1 ? (_jsxs(_Fragment, { children: [_jsx("circle", { cx: p.x, cy: p.y, r: 11 / k, className: "cuix-map-badge", style: { stroke: shapeColor(p.shape ?? 'circle', p.color) } }), _jsx("text", { x: p.x, y: p.y, textAnchor: "middle", dominantBaseline: "central", className: "cuix-map-badge-text", style: { fontSize: `${String(12 / k)}px` }, children: badgeText(n) })] })) : (_jsx(Marker, { shape: p.shape, x: p.x, y: p.y, r: 5 / k, color: p.color }))] }, p.id));
        return wrapPoint ? _jsx("g", { children: wrapPoint(p, marker) }, p.id) : marker;
    };
    return (_jsxs("div", { className: ['cuix-map', className, dragging && 'cuix-map-dragging', snap && 'cuix-map-live'].filter(Boolean).join(' '), style: colorVars(colors, style), children: [_jsx(MapStyle, {}), iso && zoomControls && (_jsxs("div", { role: "group", "aria-label": text.group, className: "cuix-map-zoom", children: [_jsx("button", { type: "button", "aria-label": text.zoomIn, "aria-disabled": zoom >= ZOOM_MAX || undefined, onClick: () => zoom < ZOOM_MAX && setZoom(stepZoom(zoom, 1)), className: "cuix-map-zoom-btn cuix-map-focus", children: _jsx("span", { "aria-hidden": true, children: "+" }) }), _jsx("button", { type: "button", "aria-label": text.zoomOut, "aria-disabled": zoom <= ZOOM_MIN || undefined, onClick: () => zoom > ZOOM_MIN && setZoom(stepZoom(zoom, -1)), className: "cuix-map-zoom-btn cuix-map-focus", children: _jsx("span", { "aria-hidden": true, children: "\u2212" }) }), _jsx("button", { type: "button", "aria-disabled": zoom <= ZOOM_MIN || undefined, onClick: () => zoom > ZOOM_MIN && setZoom(ZOOM_MIN), className: "cuix-map-zoom-btn cuix-map-zoom-fit cuix-map-focus", children: text.fit })] })), _jsxs("svg", { ref: svgRef, viewBox: VIEWBOX, role: "group", "aria-label": label, 
                // The map itself is a tab stop when it has gestures: arrows pan and + / - zoom while it, not a county, has focus.
                tabIndex: gesturesOn ? 0 : undefined, onPointerDown: gesturesOn ? pointerDown : undefined, onPointerMove: gesturesOn ? pointerMove : undefined, onPointerUp: gesturesOn ? pointerUp : undefined, onPointerCancel: gesturesOn ? pointerUp : undefined, onKeyDown: gesturesOn ? onKey : undefined, onClickCapture: gesturesOn
                    ? (e) => {
                        if (!g.current.suppress)
                            return;
                        g.current.suppress = false;
                        e.stopPropagation();
                    }
                    : undefined, onDoubleClick: gesturesOn
                    ? (e) => {
                        clearTimeout(backTimer.current);
                        zoomBy(ZOOM_STEP, toView(e.clientX, e.clientY));
                    }
                    : undefined, onClick: pin
                    ? (e) => {
                        if (e.button !== 0 || e.detail > 1)
                            return;
                        // The camera's inverse: the point in the 975x610 map space, not in the zoomed viewport.
                        const v = toView(e.clientX, e.clientY);
                        const p = { x: (v.x - camera.x) / camera.k, y: (v.y - camera.y) / camera.k };
                        if (gesturesOn) {
                            clearTimeout(backTimer.current);
                            backTimer.current = setTimeout(() => onMapClickRef.current?.(p), DBLCLICK_MS);
                        }
                        else
                            onMapClick(p);
                    }
                    : iso && onBack
                        ? (e) => {
                            // detail > 1: the second click of a double-click on a state, which landed after the zoom in.
                            if (e.button !== 0 || e.detail > 1 || e.target.closest('a, [role="button"]'))
                                return;
                            // With gestures a double-click zooms, so a click waits out the double-click window before it steps back.
                            if (gesturesOn) {
                                clearTimeout(backTimer.current);
                                backTimer.current = setTimeout(() => onBackRef.current?.(), DBLCLICK_MS);
                            }
                            else
                                onBack();
                        }
                        : undefined, className: [iso && onBack && !pin && !(gesturesOn && zoom > ZOOM_MIN) && 'cuix-map-zoomout', pin && 'cuix-map-pin', gesturesOn && 'cuix-map-gestures', gesturesOn && zoom > ZOOM_MIN && 'cuix-map-pan', gesturesOn && 'cuix-map-focus']
                    .filter(Boolean)
                    .join(' ') || undefined, children: [_jsx("defs", { children: _jsx(Hatch, { id: hatch, k: k }) }), _jsxs("g", { style: { transform: cameraTransform(camera), transformOrigin: '0 0' }, className: "cuix-map-camera", children: [_jsx("g", { "aria-hidden": true, className: iso ? 'cuix-map-faded' : undefined, children: US_STATES.filter((s) => (iso === null ? !stateRegions.has(s.fips) : s.iso !== iso)).map((s) => (_jsx("path", { d: s.d, className: "cuix-map-none" }, s.fips))) }), iso === null &&
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
                                            _jsxs("g", { role: "button", tabIndex: offscreen(boxes?.get(r.fips)), "aria-label": r.name, 
                                                // detail > 1: the second click of a double-click, which zooms and must not select again.
                                                onClick: pin ? undefined : (e) => e.detail <= 1 && onSelect('county', r.fips), 
                                                // Pin mode: the keyboard drops the pin at the centre of the county's box, as a click would on it.
                                                onKeyDown: (e) => activate(e, () => (pin ? pinAt(boxes?.get(r.fips)) : onSelect('county', r.fips))), onMouseEnter: () => !g.current.active && onHover?.(r.fips), onMouseLeave: () => !g.current.active && onHover?.(null), onFocus: (e) => {
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
                                        }) })] })), stateShape && _jsx("path", { "aria-hidden": true, d: stateShape.d, className: "cuix-map-outline" }), stateShape && overlay != null && (_jsx("g", { "aria-hidden": true, pointerEvents: "none", children: overlay })), selectedD && (_jsxs("g", { "aria-hidden": true, pointerEvents: "none", children: [_jsx("path", { d: selectedD, className: "cuix-map-ring-band" }), _jsx("path", { d: selectedD, className: "cuix-map-ring-line" })] })), ringD && (_jsxs("g", { "aria-hidden": true, pointerEvents: "none", children: [_jsx("path", { d: ringD, className: "cuix-map-ring-band" }), _jsx("path", { d: ringD, className: "cuix-map-ring-line" })] })), stateShape && shapes && points && [...points].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(point), ringPoint && (_jsxs("g", { "aria-hidden": true, pointerEvents: "none", children: [_jsx("circle", { cx: ringPoint.x, cy: ringPoint.y, r: ((ringPoint.count ?? 1) > 1 ? 15 : 9) / k, className: "cuix-map-ring-band" }), _jsx("circle", { cx: ringPoint.x, cy: ringPoint.y, r: ((ringPoint.count ?? 1) > 1 ? 15 : 9) / k, className: "cuix-map-ring-line" })] }))] }), iso === null && (_jsx("g", { "aria-hidden": true, children: states.map((r) => {
                            const s = US_STATES.find((x) => x.fips === r.fips);
                            if (!s || !r.label)
                                return null;
                            return (_jsx("text", { x: s.cx, y: s.cy, textAnchor: "middle", dominantBaseline: "central", className: "cuix-map-label", children: r.label }, r.fips));
                        }) }))] }), tipPoint && (_jsx("div", { className: "cuix-map-tip", style: {
                    left: `${String(((camera.x + tipPoint.x * k) / VIEW_W) * 100)}%`,
                    top: `${String(((camera.y + tipPoint.y * k) / VIEW_H) * 100)}%`,
                }, ref: tipBox, children: _jsx("div", { id: tipId, role: "tooltip", children: renderTooltip ? (renderTooltip(tipPoint)) : (_jsxs(_Fragment, { children: [_jsxs("span", { "aria-hidden": true, children: [tipPoint.name, tipPoint.detail ? ' · ' : ''] }), tipPoint.detail && _jsx("span", { children: tipPoint.detail })] })) }) })), iso !== null && geo.status === 'error' && (_jsx("p", { role: "alert", className: "cuix-map-error", children: errorText }))] }));
}
