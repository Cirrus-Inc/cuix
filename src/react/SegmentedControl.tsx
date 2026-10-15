'use client';

import type { ReactNode } from 'react';
import { cx } from './cx.ts';

export type Segment<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

type SegmentedControlProps<T extends string> = {
  /** Names the group for screen readers; pair it with a visible heading where one exists. */
  label: string;
  name: string;
  segments: Segment<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

// One of 2–5 options, all visible. Native radios underneath (arrow keys, one
// tab stop); the label is what is drawn. The selected segment is a filled
// accent (7:1 against the track), not a tint: a state has to read at 3:1
// (1.4.11), and a tint on surface-raised does not.
export function SegmentedControl<T extends string>({
  label,
  name,
  segments,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex gap-0.5 rounded-control bg-surface-raised p-0.5', className)}
    >
      {segments.map((s) => (
        <label
          key={s.value}
          className={cx(
            'inline-flex min-h-target min-w-target cursor-pointer items-center justify-center gap-2 rounded-inset px-3 text-body-sm font-medium transition-colors duration-fast ease-cuix',
            // The input is visually hidden, so its focus ring is drawn here.
            'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring has-focus-visible:outline-solid',
            value === s.value ? 'forced-selected bg-accent text-accent-foreground' : 'text-foreground hover:bg-surface',
          )}
        >
          <input
            type="radio"
            name={name}
            value={s.value}
            checked={value === s.value}
            onChange={() => onValueChange(s.value)}
            className="sr-only"
          />
          {s.icon}
          {s.label}
        </label>
      ))}
    </div>
  );
}
