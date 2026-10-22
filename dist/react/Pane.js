'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PanelRightClose } from 'lucide-react';
import { IconButton } from "./Button.js";
// Pass as AppShell's `pane`. A complementary landmark named by its heading
// (landmarks, 2.4.1); the body is the pane's one scroller, the header stays put.
export function AppShellPane({ title, id = 'pane', onClose, closeLabel = 'Hide panel', children }) {
    const titleId = `${id}-title`;
    return (_jsxs("aside", { id: id, "aria-labelledby": titleId, className: "flex min-h-0 flex-1 flex-col border-l border-border bg-surface", children: [_jsxs("div", { className: "flex min-h-header items-center gap-2 border-b border-border px-4", children: [_jsx("h2", { id: titleId, className: "flex-1 text-heading", children: title }), onClose && (_jsx(IconButton, { variant: "ghost", icon: _jsx(PanelRightClose, { className: "size-5", "aria-hidden": "true" }), "aria-label": closeLabel, onClick: onClose }))] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-4", children: children })] }));
}
