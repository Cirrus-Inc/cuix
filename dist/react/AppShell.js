'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
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
export function AppShell({ header, sidebar, collapsed = false, sidebarId = 'sidebar', skipLabel, children, className }) {
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
    return (_jsxs("div", { className: cx('min-h-dvh bg-background font-sans text-body text-foreground', className), children: [_jsx(SkipLink, { children: skipLabel }), header && (_jsx("header", { className: "safe-top sticky top-0 z-sticky flex min-h-header items-center gap-4 border-b border-border bg-surface px-4", children: header })), sidebar && (
            // Below lg the app reaches its nav through a Drawer (Phase 2c). From lg
            // up the column is fixed under the header and the content wrapper pads
            // for it, so the sidebar stays in view while the page scrolls.
            _jsx("div", { id: sidebarId, className: cx('fixed bottom-0 left-0 z-sidebar hidden flex-col border-r border-border bg-surface-raised lg:flex', header ? 'top-header' : 'top-0', 
                // The rail's 56px less its border must still fit a 44px target (2.5.5): px-1, not p-2.
                collapsed ? 'w-rail px-1 py-2' : 'w-sidebar p-2'), children: _jsx(CollapsedContext.Provider, { value: collapsed, children: sidebar }) })), _jsx("div", { className: cx(sidebar ? (collapsed ? 'lg:pl-rail' : 'lg:pl-sidebar') : null), children: _jsx("main", { id: "main", tabIndex: -1, className: "min-w-0", children: children }) })] }));
}
