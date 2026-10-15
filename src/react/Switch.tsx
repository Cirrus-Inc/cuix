'use client';

import { useId, type ReactNode } from 'react';
import { cx } from './cx.ts';
import { describedBy, FieldMessages } from './FieldMessages.tsx';

type SwitchProps = {
  /** Visible, and the switch's accessible name. */
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint?: ReactNode;
  /** aria-disabled: stays focusable, toggling is swallowed. */
  disabled?: boolean;
  id?: string;
  className?: string;
};

// role="switch": one bit that applies immediately. A choice submitted with a
// form is a Checkbox. The whole row (label included) is the 44px target; the
// drawn track stays track-shaped.
export function Switch({ label, checked, onCheckedChange, hint, disabled = false, id, className }: SwitchProps) {
  const generated = useId();
  const switchId = id ?? generated;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-describedby={describedBy(switchId, { hint })}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cx(
          'inline-flex min-h-target items-center gap-3 rounded-control text-left text-body',
          disabled ? 'cursor-not-allowed text-foreground-subtle' : 'text-foreground',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'inline-flex h-6 w-11 shrink-0 items-center rounded-pill border-2 p-0.5 transition-colors duration-fast ease-cuix',
            checked ? 'justify-end border-accent bg-accent' : 'justify-start border-border-strong bg-surface',
            disabled && 'border-border-strong bg-surface-raised',
          )}
        >
          {/* Off: foreground-muted on surface, 10:1. On: accent-foreground on accent, 8:1. */}
          <span
            className={cx(
              'block size-4 rounded-pill',
              disabled ? 'bg-foreground-subtle' : checked ? 'bg-accent-foreground' : 'bg-foreground-muted',
            )}
          />
        </span>
        <span>{label}</span>
      </button>
      <FieldMessages id={switchId} hint={hint} />
    </div>
  );
}
