'use client';

import * as M from '@radix-ui/react-dropdown-menu';
import { useId, type ReactNode } from 'react';
import { cx } from './cx.ts';

export type MenuItem =
  | {
      type?: 'item';
      /** Stable key for lists whose items come and go; the index is used without it. */
      id?: string;
      label: ReactNode;
      icon?: ReactNode;
      onSelect: () => void;
      /** Deleting, discarding: drawn in `danger`. */
      destructive?: boolean;
      /** aria-disabled: stays focusable and readable; selection is swallowed. */
      disabled?: boolean;
      disabledReason?: string;
    }
  | { type: 'separator' }
  | { type: 'label'; label: ReactNode };

export type MenuProps = {
  /** The opener. A Button or IconButton; it gets aria-haspopup and aria-expanded. */
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  /** Names the menu when the trigger's label doesn't (an icon-only ⋮ button). */
  label?: string;
};

const ITEM =
  'flex min-h-target cursor-default select-none items-center gap-2 rounded-inset px-3 text-body outline-none data-highlighted:bg-surface-raised';

// Radix DropdownMenu: arrow keys, type-ahead, Escape, focus back to the
// trigger. Items are 44px tall; a dense container keeps them 44.
export function Menu({ trigger, items, align = 'end', label }: MenuProps) {
  const base = useId();
  return (
    // Non-modal: the page stays in the accessibility tree while the menu is
    // open (a modal menu aria-hides a page full of focusable content).
    // Escape, outside click and focus return still work.
    <M.Root modal={false}>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={4}
          collisionPadding={8}
          // Radix sets aria-labelledby={trigger}, which beats aria-label; drop it when a label is given.
          {...(label ? { 'aria-label': label, 'aria-labelledby': undefined } : {})}
          className="z-overlay min-w-menu rounded-card border border-border-strong bg-surface p-1 text-foreground shadow-overlay"
        >
          {items.map((item, i) => {
            if (item.type === 'separator') return <M.Separator key={i} className="my-1 border-t border-border" />;
            if (item.type === 'label')
              return (
                <M.Label key={i} className="px-3 py-2 text-label text-foreground-muted">
                  {item.label}
                </M.Label>
              );
            const reasonId = `${base}-${item.id ?? i}`;
            const showReason = item.disabled && item.disabledReason;
            return (
              <M.Item
                key={item.id ?? i}
                aria-disabled={item.disabled || undefined}
                aria-describedby={showReason ? reasonId : undefined}
                onSelect={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                    return;
                  }
                  item.onSelect();
                }}
                className={cx(
                  ITEM,
                  item.disabled
                    ? 'cursor-not-allowed text-foreground-subtle'
                    : item.destructive
                      ? 'text-danger data-highlighted:bg-danger-soft data-highlighted:text-danger-on-soft'
                      : 'text-foreground',
                )}
              >
                {item.icon}
                {item.label}
                {showReason && (
                  <span id={reasonId} className="sr-only">
                    {item.disabledReason}
                  </span>
                )}
              </M.Item>
            );
          })}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
