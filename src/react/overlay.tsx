'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from './Button.tsx';
import { cx } from './cx.ts';

// Internal pieces shared by Dialog, Sheet and Drawer. Not exported from the barrel.

let pointerTarget: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  const FOCUSABLE = 'button,a[href],input,select,textarea,summary,[role="button"],[tabindex]';
  const record = (e: Event) => {
    const t = e.target instanceof Element ? e.target : null;
    pointerTarget = (t?.closest<HTMLElement>(FOCUSABLE) ?? (t as HTMLElement | null)) || null;
  };
  document.addEventListener('pointerdown', record, true);
  document.addEventListener('click', (e) => {
    record(e);
    setTimeout(() => (pointerTarget = null), 0);
  }, true);
}

/**
 * Focus return for imperative opens.
 * Radix returns focus to a `Trigger`; most lumux dialogs open from a row click
 * or a menu action, with no trigger near them. The opener is captured on the
 * closed→open transition, during render, which is the one moment that still
 * sees whatever had focus before the panel existed (an `autoFocus` child wins
 * the race against `onOpenAutoFocus`).
 */
export function useFocusReturn(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    const active = document.activeElement as HTMLElement | null;
    // Safari doesn't focus a clicked button: focus stays on body, or lands on a
    // focusable ancestor (e.g. main[tabindex=-1]). Fall back to the pointer target.
    const unfocused = !active || active === document.body || (!!pointerTarget && active.contains(pointerTarget));
    opener.current = unfocused ? (pointerTarget ?? active) : active;
  }
  wasOpen.current = open;
  return (event: Event) => {
    const el = opener.current;
    // Nothing usable was focused (a row replaced by a refresh is detached): let Radix return focus to its Trigger.
    if (!el || el === document.body || !el.isConnected) return;
    event.preventDefault();
    el.focus();
  };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export const PANEL = 'flex flex-col bg-surface text-foreground shadow-overlay outline-none';

export function OverlayHeader({
  title,
  description,
  closeLabel,
  onClose,
  Title,
  Description,
}: {
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  Title: React.ComponentType<{ asChild?: boolean; children: ReactNode }>;
  Description: React.ComponentType<{ className?: string; children: ReactNode }>;
}) {
  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Title asChild>
          <h2 className="text-heading">{title}</h2>
        </Title>
        {description && <Description className="text-body-sm text-foreground-muted">{description}</Description>}
      </div>
      {/* The one close affordance, 20px glyph in a 44px target, top-right. */}
      <IconButton
        icon={<X aria-hidden="true" size={20} />}
        aria-label={closeLabel}
        onClick={onClose}
        className="-m-2 shrink-0"
      />
    </div>
  );
}

// Secondary left, primary right on fine pointers; stacked, primary on top, on
// coarse. Pass the buttons in DOM order: cancel first, primary last.
export function OverlayFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'flex shrink-0 flex-row justify-end gap-2 border-t border-border p-4 pointer-coarse:flex-col-reverse',
        className,
      )}
    >
      {children}
    </div>
  );
}

// The only scroller: body text and forms scroll here, never the panel.
export function OverlayBody({ children, className }: { children: ReactNode; className?: string }) {
  // scroll-ok: the one body scroller of a dialog / sheet; header and footer stay fixed so the close button and the actions are always reachable
  return <div className={cx('min-h-0 flex-1 overflow-y-auto p-4', className)}>{children}</div>;
}
