'use client';

import { Slot } from '@radix-ui/react-slot';
import {
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from './cx.ts';
import { Spinner } from './Spinner.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'link';
// No `sm`: a compact look comes from data-density="dense", never height.
export type ButtonSize = 'md' | 'lg';

const BASE =
  'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none transition-colors duration-fast ease-cuix';

// Each fg/bg pair below is a legal pair in vocabulary.ts. Disabled keeps a 7:1
// pair instead of fading: inactive controls are exempt from 1.4.6, but the
// reason they are disabled still has to be readable.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent-strong',
  secondary: 'border border-border-strong bg-surface text-accent hover:bg-surface-raised',
  ghost: 'text-foreground hover:bg-surface-raised',
  danger: 'bg-danger text-danger-foreground hover:bg-danger-strong',
  'danger-outline': 'border border-danger bg-surface text-danger hover:bg-danger-soft hover:text-danger-on-soft',
  link: 'text-accent underline underline-offset-4 hover:no-underline',
};

const DISABLED = 'cursor-not-allowed border border-border-strong bg-surface-raised text-foreground-subtle';

const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-target min-w-target px-4 text-body',
  lg: 'min-h-12 min-w-12 px-6 text-subheading',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  md: 'size-target',
  lg: 'size-12',
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading by default. */
  icon?: ReactNode;
  /** Chevrons and external-link only. */
  trailingIcon?: ReactNode;
  /** A trailing slot (e.g. a cost badge): a slot after the label, not a variant. */
  badge?: ReactNode;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
    /** React 19 ref prop: for a mount-time focus (ConfirmInline's Keep). */
    ref?: Ref<HTMLButtonElement>;
    /** Spinner replaces the leading icon, the label stays, the width does not change. */
    loading?: boolean;
    /**
     * Renders aria-disabled, not the native attribute, so the button stays
     * focusable and its reason reachable. Clicks are swallowed.
     */
    disabled?: boolean;
    /** Why it is disabled, announced through aria-describedby. Never a `title`. */
    disabledReason?: string;
  };

function ButtonImpl({
  square = false,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  badge,
  loading = false,
  disabled = false,
  disabledReason,
  type = 'button',
  className,
  children,
  onClick,
  ref,
  'aria-describedby': describedBy,
  ...rest
}: ButtonProps & { square?: boolean }) {
  const reasonId = useId();
  const inert = disabled || loading;
  const showReason = disabled && disabledReason;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (inert) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <>
      <button
        ref={ref}
        type={type}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        aria-describedby={cx(describedBy, showReason && reasonId) || undefined}
        onClick={handleClick}
        className={cx(BASE, square ? ICON_SIZE[size] : SIZE[size], disabled ? DISABLED : VARIANT[variant], className)}
        {...rest}
      >
        {loading && !icon ? (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
            <span className="inline-flex items-center gap-2 opacity-0">
              {children}
              {badge}
              {trailingIcon}
            </span>
          </>
        ) : (
          <>
            {loading ? <Spinner /> : icon}
            {children}
            {badge}
            {trailingIcon}
          </>
        )}
      </button>
      {showReason && (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      )}
    </>
  );
}

export function Button(props: ButtonProps) {
  return <ButtonImpl {...props} />;
}

type IconButtonProps = Omit<ButtonProps, 'icon' | 'trailingIcon' | 'badge' | 'children'> & {
  icon: ReactNode;
  /** Icon-only controls have no visible name, so this is required. */
  'aria-label': string;
};

export function IconButton({ variant = 'ghost', ...rest }: IconButtonProps) {
  return <ButtonImpl square variant={variant} {...rest} />;
}

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** Render the child (a router Link) with the button's look. */
    asChild?: boolean;
  };

// A control that navigates is a link, never a button that calls navigate().
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  badge,
  asChild = false,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp className={cx(BASE, SIZE[size], VARIANT[variant], className)} {...rest}>
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          {children}
          {badge}
          {trailingIcon}
        </>
      )}
    </Comp>
  );
}
