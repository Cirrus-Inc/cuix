'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { cx } from "./cx.js";
import { describedBy, FieldMessages } from "./FieldMessages.js";
// A native checkbox inside its label. The label row is the target (min 44px
// tall), so the drawn box can stay 20px.
export function Checkbox({ label, hint, error, id, className, ...rest }) {
    const generated = useId();
    const inputId = id ?? generated;
    return (_jsxs("div", { className: cx('flex flex-col gap-1', className), children: [_jsxs("label", { htmlFor: inputId, className: "inline-flex min-h-target cursor-pointer items-center gap-3 text-body text-foreground has-disabled:cursor-not-allowed has-disabled:text-foreground-subtle", children: [_jsx("input", { ...rest, id: inputId, type: "checkbox", "aria-invalid": error ? true : undefined, "aria-describedby": describedBy(inputId, { hint, error }, rest['aria-describedby']), className: "size-5 shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed" }), label] }), _jsx(FieldMessages, { id: inputId, hint: hint, error: error })] }));
}
