'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from './cx.ts';
import { CollapsedContext } from './Sidebar.tsx';

// 2.4.1: the first focusable element on every page. Hidden until focused.
export function SkipLink({ href = '#main', children = 'Skip to content' }: { href?: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-tooltip focus:inline-flex focus:min-h-target focus:items-center focus:rounded-control focus:bg-surface focus:px-4 focus:text-body focus:text-foreground focus:shadow-overlay"
    >
      {children}
    </a>
  );
}

/** 2.4.2: each route names itself. `Contacts · Acme`; the app name alone when untitled. */
export function useDocumentTitle(title: string | undefined, app: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${app}` : app;
  }, [title, app]);
}

type AppShellProps = {
  /** Header contents; the shell supplies the <header> landmark. */
  header?: ReactNode;
  /** Sidebar contents: a `Sidebar`, or your own <nav> with aria-current on the active link. */
  sidebar?: ReactNode;
  /** Icon rail instead of the full sidebar, from `lg` up. Controlled: the app stores it (see useStoredBoolean). */
  collapsed?: boolean;
  /** The sidebar column's id, for SidebarToggle's aria-controls. */
  sidebarId?: string;
  skipLabel?: string;
  /** A column fixed on the right from `lg` up, usually an `AppShellPane`. Pass it only while open: the app owns the state. Below `lg` nothing renders (use a non-modal `Sheet`). */
  pane?: ReactNode;
  /** Bottom tab bar below `lg`, usually `BottomTabs`. In flow and sticky at the bottom, so `main` needs no padding for it. */
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppShell({ header, sidebar, collapsed = false, sidebarId = 'sidebar', skipLabel, pane, tabs, children, className }: AppShellProps) {
  // 2.4.11: a focused element scrolled into view must not land under the
  // sticky header.
  useEffect(() => {
    if (!header) return;
    const root = document.documentElement;
    root.style.scrollPaddingTop = 'calc(var(--cuix-header-height) + var(--cuix-safe-top))';
    return () => {
      root.style.scrollPaddingTop = '';
    };
  }, [header]);

  // 2.4.12: the sticky tab bar must not cover a focused element. Mirror its
  // height into scroll-padding-bottom so the browser scrolls focus clear of it.
  // Below lg only: from lg up the slot is display:none, so the height is 0.
  const tabsRef = useRef<HTMLDivElement>(null);
  const hasTabs = Boolean(tabs);
  useEffect(() => {
    const slot = tabsRef.current;
    if (!hasTabs || !slot) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.scrollPaddingBottom = `${slot.getBoundingClientRect().height}px`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(slot);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingBottom = '';
    };
  }, [hasTabs]);

  return (
    <div className={cx('flex min-h-dvh flex-col bg-background font-sans text-body text-foreground', className)}>
      <SkipLink>{skipLabel}</SkipLink>
      {header && (
        <header className="safe-top sticky top-0 z-sticky flex min-h-header items-center gap-4 border-b border-border bg-surface px-4">
          {header}
        </header>
      )}
      {sidebar && (
        // Below lg the app reaches its nav through a Drawer or the tabs slot
        // below (Phase 2c). From lg up the column is fixed under the header and
        // the content wrapper pads for it, so it stays in view while the page scrolls.
        <div
          id={sidebarId}
          className={cx(
            'fixed bottom-0 left-0 z-sidebar hidden flex-col border-r border-border bg-surface-raised lg:flex',
            header ? 'top-header' : 'top-0',
            // The rail's 56px less its border must still fit a 44px target (2.5.5): px-1, not p-2.
            collapsed ? 'w-rail px-1 py-2' : 'w-sidebar p-2',
          )}
        >
          <CollapsedContext.Provider value={collapsed}>{sidebar}</CollapsedContext.Provider>
        </div>
      )}
      <div className={cx('flex-1', sidebar ? (collapsed ? 'lg:pl-rail' : 'lg:pl-sidebar') : null, pane ? 'lg:pr-100' : null)}>
        <main id="main" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>
      {pane && (
        // From lg up, like the sidebar: fixed under the header, and the content
        // wrapper reserves it. After main in the DOM, as it is on screen, so Tab
        // reaches the page before the pane (2.4.3, 1.3.2). Below lg nothing
        // renders; the app uses a non-modal Sheet there.
        <div className={cx('fixed bottom-0 right-0 z-sidebar hidden w-100 flex-col lg:flex', header ? 'top-header' : 'top-0')}>{pane}</div>
      )}
      {tabs && (
        // In flow after the content (root is a flex column), sticky to the
        // viewport bottom: the last line of content is never under the bar
        // (1.4.10, 2.4.11) and short pages still seat it at the bottom.
        <div ref={tabsRef} className="sticky bottom-0 z-sticky lg:hidden">
          {tabs}
        </div>
      )}
    </div>
  );
}
