'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Slot } from '@radix-ui/react-slot';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useState, } from 'react';
import { IconButton } from "./Button.js";
import { cx } from "./cx.js";
import { Tooltip } from "./Tooltip.js";
// Items read rail mode from here. AppShell provides it around its sidebar
// column; no provider (an item inside a Drawer) means expanded.
export const CollapsedContext = createContext(false);
// Pass as AppShell's `sidebar`. The nav is the sidebar's one scroller; the
// footer stays in view below it.
export function Sidebar({ label = 'Main', collapsed: own, footer, children }) {
    const shell = useContext(CollapsedContext);
    const collapsed = own ?? shell;
    return (_jsxs(CollapsedContext.Provider, { value: collapsed, children: [_jsx("nav", { "aria-label": label, className: "min-h-0 flex-1 overflow-y-auto", children: children }), footer && _jsx("div", { className: cx('flex border-t border-border pt-2', collapsed ? 'justify-center' : 'justify-end'), children: footer })] }));
}
// Every section after the first gets a divider.
export function SidebarSection({ label, children }) {
    const collapsed = useContext(CollapsedContext);
    return (_jsxs("div", { role: "group", "aria-label": label, className: "grid gap-1 not-first:mt-6 not-first:border-t not-first:border-border not-first:pt-4", children: [label && !collapsed && (_jsx("p", { "aria-hidden": "true", className: "px-3 text-body-sm text-foreground-muted", children: label })), children] }));
}
export function SidebarItem({ icon, label, count, current = false, asChild = false, className, children, ...rest }) {
    const rail = useContext(CollapsedContext);
    const glyph = isValidElement(icon)
        ? cloneElement(icon, {
            className: cx('size-5 shrink-0', icon.props.className),
            'aria-hidden': true,
        })
        : icon;
    const content = (_jsxs(_Fragment, { children: [glyph, _jsx("span", { className: cx(rail && 'sr-only'), children: label }), count !== undefined && _jsx("span", { className: rail ? 'sr-only' : 'ml-auto text-body-sm', children: count })] }));
    const props = {
        ...rest,
        'aria-current': current ? 'page' : undefined,
        className: cx('flex min-h-target items-center gap-3 rounded-control border-l-2 hover:bg-surface hover:text-foreground', rail ? 'justify-center' : 'px-3', current ? 'border-foreground bg-surface font-medium text-foreground' : 'border-transparent text-foreground-muted', className),
    };
    const item = asChild && isValidElement(children) ? (_jsx(Slot, { ...props, children: cloneElement(children, undefined, content) })) : (_jsx("a", { ...props, children: content }));
    return rail ? (_jsx(Tooltip, { content: label, side: "right", children: item })) : (item);
}
export function SidebarToggle({ collapsed, onCollapsedChange, controls = 'sidebar', labels = { expand: 'Expand sidebar', collapse: 'Collapse sidebar' }, }) {
    return (_jsx(IconButton, { variant: "ghost", icon: collapsed ? _jsx(PanelLeftOpen, { className: "size-5", "aria-hidden": "true" }) : _jsx(PanelLeftClose, { className: "size-5", "aria-hidden": "true" }), "aria-label": collapsed ? labels.expand : labels.collapse, "aria-expanded": !collapsed, "aria-controls": controls, onClick: () => onCollapsedChange(!collapsed) }));
}
/**
 * A boolean kept in localStorage as '1' / '0'. On the server, and when storage
 * throws, it returns `initial`; the client reads storage on first render, so an
 * SSR app that hydrates a stored `true` mismatches once.
 */
export function useStoredBoolean(key, initial) {
    const [value, setValue] = useState(() => {
        if (typeof window === 'undefined')
            return initial;
        try {
            const stored = window.localStorage.getItem(key);
            return stored === null ? initial : stored === '1';
        }
        catch {
            return initial;
        }
    });
    useEffect(() => {
        try {
            window.localStorage.setItem(key, value ? '1' : '0');
        }
        catch {
            // Not remembered; the session still works.
        }
    }, [key, value]);
    return [value, useCallback((next) => setValue(next), [])];
}
