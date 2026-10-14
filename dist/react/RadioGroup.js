'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { cx } from "./cx.js";
import { describedBy, FieldMessages, RequiredMark } from "./FieldMessages.js";
// Native radios in a fieldset: arrow keys, one tab stop and form semantics come
// from the platform. Each label row is a 44px target.
export function RadioGroup({ legend, name, options, value, onValueChange, hint, error, required = false, requiredLabel, className, }) {
    const id = useId();
    return (_jsxs("fieldset", { "aria-describedby": describedBy(id, { hint, error }), "aria-invalid": error ? true : undefined, className: cx('flex flex-col gap-1', className), children: [_jsxs("legend", { className: "mb-1 text-body-sm font-medium text-foreground", children: [legend, required && _jsx(RequiredMark, { label: requiredLabel })] }), options.map((o) => (_jsxs("label", { className: "inline-flex min-h-target cursor-pointer items-center gap-3 text-body text-foreground has-disabled:cursor-not-allowed has-disabled:text-foreground-subtle", children: [_jsx("input", { type: "radio", name: name, value: o.value, checked: value === o.value, disabled: o.disabled, required: required, onChange: () => onValueChange(o.value), className: "size-5 shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed" }), o.label] }, o.value))), _jsx(FieldMessages, { id: id, hint: hint, error: error })] }));
}
