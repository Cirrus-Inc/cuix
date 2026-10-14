'use client';

import { useId, type ReactNode } from 'react';
import { cx } from './cx.ts';
import { describedBy, FieldMessages, RequiredMark } from './FieldMessages.tsx';

export type RadioOption = { value: string; label: ReactNode; disabled?: boolean };

type RadioGroupProps = {
  legend: ReactNode;
  name: string;
  options: RadioOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  requiredLabel?: string;
  className?: string;
};

// Native radios in a fieldset: arrow keys, one tab stop and form semantics come
// from the platform. Each label row is a 44px target. The circle and the dot
// are drawn with tokens so every edge is a pair check-contrast verifies.
export function RadioGroup({
  legend,
  name,
  options,
  value,
  onValueChange,
  hint,
  error,
  required = false,
  requiredLabel,
  className,
}: RadioGroupProps) {
  const id = useId();
  return (
    <fieldset
      aria-describedby={describedBy(id, { hint, error })}
      aria-invalid={error ? true : undefined}
      className={cx('group flex flex-col gap-1', className)}
    >
      <legend className="mb-1 text-body-sm font-medium text-foreground">
        {legend}
        {required && <RequiredMark label={requiredLabel} />}
      </legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="inline-flex min-h-target cursor-pointer items-center gap-3 text-body text-foreground has-disabled:cursor-not-allowed has-disabled:text-foreground-subtle"
        >
          <span className="relative inline-flex shrink-0">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              required={required}
              onChange={() => onValueChange(o.value)}
              className="peer size-5 cursor-pointer appearance-none rounded-pill border-2 border-border-strong bg-surface group-aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-raised"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-pill border-2 border-accent bg-surface text-accent peer-checked:flex peer-disabled:border-border-strong peer-disabled:bg-surface-raised peer-disabled:text-foreground-subtle"
            >
              <span className="size-2 rounded-pill bg-current forced-color-adjust-none" />
            </span>
          </span>
          {o.label}
        </label>
      ))}
      <FieldMessages id={id} hint={hint} error={error} />
    </fieldset>
  );
}
