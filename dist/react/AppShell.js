'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { cx } from "./cx.js";
import { CollapsedContext } from "./Sidebar.js";
// 2.4.1: the first focusable element on every page. Hidden until focused.
export function SkipLink({ href = '#main', children = 'Skip to content' }) {
    return (_jsx("a", { href: href, className: "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-tooltip focus:inline-flex focus:min-h-target focus:items-center focus:rounded-control focus:bg-surface focus:px-4 focus:text-body focus:text-foreground focus:shadow-overlay", children: children }));
}
/** 2.4.2: each route names itself. `Contacts · Acme`; the app name alone when untitled. */
export function useDocumentTitle(title, app) {
    useEffect(() => {
        document.title = title ? `${title} · ${app}` : app;
    }, [title, app]);
}
export function AppShell({ header, sidebar, collapsed = false, sidebarId = 'sidebar', skipLabel, pane, tabs, children, className }) {
    // 2.4.11: a focused element scrolled into view must not land under the
    // sticky header.
    useEffect(() => {
        if (!header)
            return;
        const root = document.documentElement;
        root.style.scrollPaddingTop = 'calc(var(--cuix-header-height) + var(--cuix-safe-top))';
        return () => {
            root.style.scrollPaddingTop = '';
        };
    }, [header]);
    // 2.4.12: the sticky tab bar must not cover a focused element. Mirror its
    // height into scroll-padding-bottom so the browser scrolls focus clear of it.
    // Below lg only: from lg up the slot is display:none, so the height is 0.
    const tabsRef = useRef(null);
    const hasTabs = Boolean(tabs);
    useEffect(() => {
        const slot = tabsRef.current;
        if (!hasTabs || !slot)
            return;
        const root = document.documentElement;
        const apply = () => {
            root.style.scrollPaddingBottom = `${slot.getBoundingClientRect().height}px`;
        };
        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(slot);
        return () => {
            observer.disconnect();
            root.style.scrollPaddingBottom = '';
        };
    }, [hasTabs]);
    return (_jsxs("div", { className: cx('flex min-h-dvh flex-col bg-background font-sans text-body text-foreground', className), children: [_jsx(SkipLink, { children: skipLabel }), header && (_jsx("header", { className: "safe-top sticky top-0 z-sticky flex min-h-header items-center gap-4 border-b border-border bg-surface px-4", children: header })), sidebar && (
            // Below lg the app reaches its nav through a Drawer or the tabs slot
            // below (Phase 2c). From lg up the column is fixed under the header and
            // the content wrapper pads for it, so it stays in view while the page scrolls.
            _jsx("div", { id: sidebarId, className: cx('fixed bottom-0 left-0 z-sidebar hidden flex-col border-r border-border bg-surface-raised lg:flex', header ? 'top-header' : 'top-0', 
                // The rail's 56px less its border must still fit a 44px target (2.5.5): px-1, not p-2.
                collapsed ? 'w-rail px-1 py-2' : 'w-sidebar p-2'), children: _jsx(CollapsedContext.Provider, { value: collapsed, children: sidebar }) })), _jsx("div", { className: cx('flex-1', sidebar ? (collapsed ? 'lg:pl-rail' : 'lg:pl-sidebar') : null, pane ? 'lg:pr-100' : null), children: _jsx("main", { id: "main", tabIndex: -1, className: "min-w-0", children: children }) }), pane && (
            // From lg up, like the sidebar: fixed under the header, and the content
            // wrapper reserves it. After main in the DOM, as it is on screen, so Tab
            // reaches the page before the pane (2.4.3, 1.3.2). Below lg nothing
            // renders; the app uses a non-modal Sheet there.
            _jsx("div", { className: cx('fixed bottom-0 right-0 z-sidebar hidden w-100 flex-col lg:flex', header ? 'top-header' : 'top-0'), children: pane })), tabs && (
            // In flow after the content (root is a flex column), sticky to the
            // viewport bottom: the last line of content is never under the bar
            // (1.4.10, 2.4.11) and short pages still seat it at the bottom.
            _jsx("div", { ref: tabsRef, className: "sticky bottom-0 z-sticky lg:hidden", children: tabs }))] }));
}
