'use client';

import { useEffect, type ReactNode } from 'react';
import { cx } from './cx.ts';

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
  /** Sidebar contents, usually a <nav> with aria-current on the active link. */
  sidebar?: ReactNode;
  skipLabel?: string;
  children: ReactNode;
  className?: string;
};

export function AppShell({ header, sidebar, skipLabel, children, className }: AppShellProps) {
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

  return (
    <div className={cx('min-h-dvh bg-background font-sans text-body text-foreground', className)}>
      <SkipLink>{skipLabel}</SkipLink>
      {header && (
        <header className="safe-top sticky top-0 z-sticky flex min-h-header items-center gap-4 border-b border-border bg-surface px-4">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          // Below lg the app reaches its nav through a Drawer (Phase 2c).
          <div className="hidden w-sidebar shrink-0 border-r border-border bg-surface-raised lg:block">
            {sidebar}
          </div>
        )}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
