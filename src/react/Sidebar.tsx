'use client';

import { Slot } from '@radix-ui/react-slot';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { IconButton } from './Button.tsx';
import { cx } from './cx.ts';
import { Tooltip } from './Tooltip.tsx';

// Items read rail mode from here. AppShell provides it around its sidebar
// column; no provider (an item inside a Drawer) means expanded.
export const CollapsedContext = createContext(false);

export type SidebarProps = {
  /** The <nav> landmark's accessible name. */
  label?: string;
  /** Icon rail: items show their icon only. Defaults to AppShell's `collapsed`. */
  collapsed?: boolean;
  /** Below the scroller, behind a top border: an app's menus or the SidebarToggle. */
  footer?: ReactNode;
  children: ReactNode;
};

// Pass as AppShell's `sidebar`. The nav is the sidebar's one scroller; the
// footer stays in view below it.
export function Sidebar({ label = 'Main', collapsed: own, footer, children }: SidebarProps) {
  const shell = useContext(CollapsedContext);
  const collapsed = own ?? shell;
  return (
    <CollapsedContext.Provider value={collapsed}>
      {/* scroll-ok: the sidebar's one scroller, for viewports shorter than the item list */}
      <nav aria-label={label} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </nav>
      {footer && <div className={cx('flex border-t border-border pt-2', collapsed ? 'justify-center' : 'justify-end')}>{footer}</div>}
    </CollapsedContext.Provider>
  );
}

export type SidebarSectionProps = {
  /** Named for assistive tech always; drawn only while the sidebar is expanded. */
  label?: string;
  children: ReactNode;
};

// Every section after the first gets a divider.
export function SidebarSection({ label, children }: SidebarSectionProps) {
  const collapsed = useContext(CollapsedContext);
  return (
    <div role="group" aria-label={label} className="grid gap-1 not-first:mt-6 not-first:border-t not-first:border-border not-first:pt-4">
      {label && !collapsed && (
        <p aria-hidden="true" className="px-3 text-body-sm text-foreground-muted">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export type SidebarItemProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  /** A lucide icon element; the item sizes it (size-5) and hides it from assistive tech. */
  icon: ReactNode;
  /** The accessible name; drawn beside the icon, and as the tooltip in rail mode. */
  label: string;
  /** A number beside the label (unread, open). Read after the label, also in rail mode. */
  count?: number;
  /** The current page: sets aria-current="page". */
  current?: boolean;
  /** Render the child (a router Link, empty) with the item's look and content. */
  asChild?: boolean;
  children?: ReactElement;
};

export function SidebarItem({ icon, label, count, current = false, asChild = false, className, children, ...rest }: SidebarItemProps) {
  const rail = useContext(CollapsedContext);
  const glyph = isValidElement<{ className?: string }>(icon)
    ? cloneElement(icon as ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
        className: cx('size-5 shrink-0', icon.props.className),
        'aria-hidden': true,
      })
    : icon;
  const content = (
    <>
      {glyph}
      <span className={cx(rail && 'sr-only')}>{label}</span>
      {count !== undefined && <span className={rail ? 'sr-only' : 'ml-auto text-body-sm'}>{count}</span>}
    </>
  );
  const props = {
    ...rest,
    'aria-current': current ? ('page' as const) : undefined,
    className: cx(
      'flex min-h-target items-center gap-3 rounded-control border-l-2 hover:bg-surface hover:text-foreground',
      rail ? 'justify-center' : 'px-3',
      current ? 'border-foreground bg-surface font-medium text-foreground' : 'border-transparent text-foreground-muted',
      className,
    ),
  };
  const item =
    asChild && isValidElement(children) ? (
      <Slot {...props}>{cloneElement(children, undefined, content)}</Slot>
    ) : (
      <a {...props}>{content}</a>
    );
  return rail ? (
    <Tooltip content={label} side="right">
      {item}
    </Tooltip>
  ) : (
    item
  );
}

export type SidebarToggleProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** The id of the element it resizes: AppShell's `sidebarId`. */
  controls?: string;
  labels?: { expand: string; collapse: string };
};

export function SidebarToggle({
  collapsed,
  onCollapsedChange,
  controls = 'sidebar',
  labels = { expand: 'Expand sidebar', collapse: 'Collapse sidebar' },
}: SidebarToggleProps) {
  return (
    <IconButton
      variant="ghost"
      icon={collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
      aria-label={collapsed ? labels.expand : labels.collapse}
      aria-expanded={!collapsed}
      aria-controls={controls}
      onClick={() => onCollapsedChange(!collapsed)}
    />
  );
}

/**
 * A boolean kept in localStorage as '1' / '0'. On the server, and when storage
 * throws, it returns `initial`; the client reads storage on first render, so an
 * SSR app that hydrates a stored `true` mismatches once.
 */
export function useStoredBoolean(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? '1' : '0');
    } catch {
      // Not remembered; the session still works.
    }
  }, [key, value]);
  return [value, useCallback((next: boolean) => setValue(next), [])];
}
