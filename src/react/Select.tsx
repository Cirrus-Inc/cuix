'use client';

import * as S from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CONTROL, EDGE, useFieldProps } from './Field.tsx';
import { cx } from './cx.ts';

export type SelectOption = {
  /** Non-empty: Radix reserves the empty string for "no selection". */
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown while nothing is selected. */
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Defaults to the Field's id, so the label focuses the trigger. */
  id?: string;
  autoComplete?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
};

const ITEM =
  'flex min-h-target cursor-default select-none items-center gap-2 rounded-inset px-3 text-body text-foreground outline-none ' +
  'data-highlighted:bg-surface-raised data-disabled:cursor-not-allowed data-disabled:text-foreground-subtle';

// Radix Select: the same popup in every browser, styled like Menu. Arrow
// keys, Home / End, type-ahead, Escape and focus return come from Radix; the
// trigger is a role=combobox button, so the Field label focuses it.
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  name,
  disabled,
  required,
  autoComplete,
  className,
  ...rest
}: SelectProps) {
  const { invalid, props } = useFieldProps({ ...rest, required });
  // Tracked here so the selected item can carry `forced-selected` as a class, like SegmentedControl.
  const [inner, setInner] = useState(defaultValue);
  const selected = value ?? inner;
  const trigger = useRef<HTMLButtonElement>(null);
  const fromLabel = useRef(false);
  // A <label> forwards a click to its control, and Radix opens on any click it did not see a
  // pointerdown for. Native labels only focus; do the same.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const label = e.target instanceof Element ? e.target.closest('label') : null;
      if (!label || label.control !== trigger.current) return;
      fromLabel.current = true;
      setTimeout(() => (fromLabel.current = false));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  const { required: isRequired, ...triggerProps } = props as { required?: boolean } & Record<string, unknown>;
  return (
    <S.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => {
        setInner(v);
        onValueChange?.(v);
      }}
      name={name}
      disabled={disabled}
      required={isRequired ?? required}
      autoComplete={autoComplete}
    >
      <S.Trigger
        ref={trigger}
        {...rest}
        onClick={(e) => {
          if (!fromLabel.current) return;
          e.preventDefault();
          trigger.current?.focus();
        }}
        {...triggerProps}
        className={cx(
          CONTROL,
          EDGE(invalid),
          'flex min-h-target items-center justify-between gap-2 px-3 text-left data-placeholder:text-foreground-subtle',
          className,
        )}
      >
        {/* The label is passed in so server HTML carries it: Radix fills the value from the closed item list after mount. */}
        <S.Value placeholder={placeholder}>{options.find((o) => o.value === selected)?.label}</S.Value>
        <S.Icon asChild>
          <ChevronDown aria-hidden="true" className="shrink-0 text-foreground-muted" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          // scroll-ok: a long option list scrolls inside the popup, capped to the space left on screen
          className="z-overlay max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-menu overflow-y-auto rounded-card border border-border-strong bg-surface p-1 text-foreground shadow-overlay"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} disabled={o.disabled} className={cx(ITEM, o.value === selected && 'forced-selected')}>
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="ml-auto flex">
                  <Check aria-hidden="true" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
