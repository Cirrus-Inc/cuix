'use client';

import { Slot } from '@radix-ui/react-slot';
import {
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from './cx.ts';

export type BottomTabsProps = {
  /** The <nav> landmark's accessible name. */
  label?: string;
  /** Three to five `BottomTab`s; nothing enforces it. */
  children: ReactNode;
};

// Pass as AppShell's `tabs`. Equal columns from the grid, no inline style. The
// bar sits in flow at the end of the page (AppShell makes it sticky), so no
// content hides under it (1.4.10 reflow, 2.4.11).
export function BottomTabs({ label = 'Tabs', children }: BottomTabsProps) {
  return (
    <nav aria-label={label} className="safe-bottom grid grid-flow-col auto-cols-fr border-t border-border bg-surface">
      {children}
    </nav>
  );
}

export type BottomTabProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  /** A lucide icon element; the tab sizes it (size-5) and hides it from assistive tech. */
  icon: ReactNode;
  /** The accessible name, always drawn under the icon. */
  label: string;
  /** The current page: sets aria-current="page". */
  current?: boolean;
  /** Render the child (a router Link, empty) with the tab's look and content. */
  asChild?: boolean;
  children?: ReactElement;
};

export function BottomTab({ icon, label, current = false, asChild = false, className, children, ...rest }: BottomTabProps) {
  const glyph = isValidElement<{ className?: string }>(icon)
    ? cloneElement(icon as ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        className: cx('size-5 shrink-0', icon.props.className),
        'aria-hidden': true,
      })
    : icon;
  const content = (
    <>
      {glyph}
      {label}
    </>
  );
  const props = {
    ...rest,
    'aria-current': current ? ('page' as const) : undefined,
    className: cx(
      // 2.5.5: min-h-target keeps the whole tab a 44px target. The current tab
      // reads by border and colour together, not colour alone (1.4.1).
      'flex min-h-target flex-col items-center justify-center gap-1 border-t-2 py-1 text-caption',
      current ? 'border-foreground text-foreground' : 'border-transparent text-foreground-muted',
      className,
    ),
  };
  return asChild && isValidElement(children) ? (
    <Slot {...props}>{cloneElement(children, undefined, content)}</Slot>
  ) : (
    <a {...props}>{content}</a>
  );
}
