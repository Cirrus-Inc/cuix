'use client';

import { ChevronDown } from 'lucide-react';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx.ts';
import { describedBy, FieldMessages, RequiredMark } from './FieldMessages.tsx';

type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
  setControlId: (id: string | undefined) => void;
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const FieldContext = createContext<FieldContextValue | null>(null);

type FieldProps = {
  /** A noun phrase, ≤3 words, no trailing colon (docs/copy.md). */
  label: ReactNode;
  /** A fact the label and layout don't state; ≤90 chars. */
  hint?: ReactNode;
  /** What is wrong and what fixes it. Present = the control is invalid. */
  error?: ReactNode;
  required?: boolean;
  /** The word shown for `required`, for translated UIs. */
  requiredLabel?: string;
  /** Defaults to a generated id. */
  id?: string;
  children: ReactNode;
  className?: string;
};

// Label above, control, hint, error. Wires the control it wraps: id,
// aria-describedby, aria-invalid and required come from here, so a field can't
// be half-connected. Validation timing is the app's (on submit, then on change
// for fields that have errored).
export function Field({ label, hint, error, required = false, requiredLabel, id, children, className }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [controlId, setControlId] = useState<string>();
  // Server render and first paint: read a single child's own id, before the control registers it.
  const only = Children.count(children) === 1 && isValidElement<{ id?: unknown }>(children) ? children.props.id : undefined;
  const childId = typeof only === 'string' ? only : undefined;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={controlId ?? childId ?? fieldId} className="text-body-sm font-medium text-foreground">
        {label}
        {required && <RequiredMark label={requiredLabel} />}
      </label>
      <FieldContext.Provider
        value={{ id: fieldId, describedBy: describedBy(fieldId, { hint, error }), invalid: !!error, required, setControlId }}
      >
        {children}
      </FieldContext.Provider>
      <FieldMessages id={fieldId} hint={hint} error={error} />
    </div>
  );
}

export function useFieldProps(own: { id?: string; 'aria-describedby'?: string; required?: boolean }) {
  const field = useContext(FieldContext);
  const setControlId = field?.setControlId;
  useIsoLayoutEffect(() => {
    setControlId?.(own.id);
    return () => setControlId?.(undefined);
  }, [setControlId, own.id]);
  if (!field) return { invalid: false, props: {} };
  return {
    invalid: field.invalid,
    props: {
      id: own.id ?? field.id,
      'aria-describedby': cx(field.describedBy, own['aria-describedby']) || undefined,
      'aria-invalid': field.invalid || undefined,
      required: own.required ?? (field.required || undefined),
    },
  };
}

// 16px on every coarse pointer is enforced in tokens.css, dense included.
export const CONTROL =
  'w-full rounded-control border bg-surface text-body text-foreground placeholder:text-foreground-subtle transition-colors duration-fast ease-lumux ' +
  'disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-foreground-subtle read-only:bg-surface-raised';

export const EDGE = (invalid: boolean) => (invalid ? 'border-danger' : 'border-border-strong');

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Decorative leading icon (search, mail). */
  icon?: ReactNode;
};

/** Pass `autoComplete` whenever the field has a known purpose (1.3.5). */
export function Input({ icon, className, ...rest }: InputProps) {
  const { invalid, props } = useFieldProps(rest);
  const input = (
    <input
      {...rest}
      {...props}
      className={cx(CONTROL, EDGE(invalid), 'min-h-target', icon ? 'pr-3 pl-10' : 'px-3', !icon && className)}
    />
  );
  if (!icon) return input;
  return (
    <div className={cx('relative flex items-center', className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 flex text-foreground-muted">
        {icon}
      </span>
      {input}
    </div>
  );
}

export function Textarea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { invalid, props } = useFieldProps(rest);
  return (
    <textarea
      rows={rows}
      {...rest}
      {...props}
      className={cx(CONTROL, EDGE(invalid), 'min-h-target resize-y px-3 py-2', className)}
    />
  );
}

/** Native <select>: the platform picker on phones, full keyboard and screen-reader support for free. */
export function NativeSelect({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const { invalid, props } = useFieldProps(rest);
  return (
    <div className={cx('relative flex items-center', className)}>
      <select {...rest} {...props} className={cx(CONTROL, EDGE(invalid), 'min-h-target appearance-none pr-10 pl-3')}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 text-foreground-muted" />
    </div>
  );
}
