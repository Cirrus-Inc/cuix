'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Slot } from '@radix-ui/react-slot';
import { cloneElement, isValidElement, } from 'react';
import { cx } from "./cx.js";
// Pass as AppShell's `tabs`. Equal columns from the grid, no inline style. The
// bar sits in flow at the end of the page (AppShell makes it sticky), so no
// content hides under it (1.4.10 reflow, 2.4.11).
export function BottomTabs({ label = 'Tabs', children }) {
    return (_jsx("nav", { "aria-label": label, className: "safe-bottom grid grid-flow-col auto-cols-fr border-t border-border bg-surface", children: children }));
}
export function BottomTab({ icon, label, current = false, asChild = false, className, children, ...rest }) {
    const glyph = isValidElement(icon)
        ? cloneElement(icon, {
            className: cx('size-5 shrink-0', icon.props.className),
            'aria-hidden': true,
        })
        : icon;
    const content = (_jsxs(_Fragment, { children: [glyph, label] }));
    const props = {
        ...rest,
        'aria-current': current ? 'page' : undefined,
        className: cx(
        // 2.5.5: min-h-target keeps the whole tab a 44px target. The current tab
        // reads by border and colour together, not colour alone (1.4.1).
        'flex min-h-target flex-col items-center justify-center gap-1 border-t-2 py-1 text-caption', current ? 'border-foreground text-foreground' : 'border-transparent text-foreground-muted', className),
    };
    return asChild && isValidElement(children) ? (_jsx(Slot, { ...props, children: cloneElement(children, undefined, content) })) : (_jsx("a", { ...props, children: content }));
}
