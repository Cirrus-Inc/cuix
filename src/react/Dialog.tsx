'use client';

import * as D from '@radix-ui/react-dialog';
import { createContext, useContext, type ReactNode } from 'react';
import { cx } from './cx.ts';
import { OverlayBody, OverlayFooter, OverlayHeader, PANEL, useFocusReturn } from './overlay.tsx';

export type DialogSize = 'sm' | 'md' | 'lg' | 'full';

// Below `sm` every size is a full-screen sheet from the bottom.
const SIZE: Record<DialogSize, string> = {
  sm: 'sm:max-w-dialog-sm',
  md: 'sm:max-w-dialog-md',
  lg: 'sm:max-w-dialog-lg',
  full: 'sm:max-w-none',
};

// One level of nesting: the second dialog sits at z-modal-top; a third
// is a design error and logs in development.
const Depth = createContext(0);
const DEV = (() => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
})();

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The accessible name. Always visible. */
  title: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  /** Buttons in DOM order: cancel first, primary last. */
  footer?: ReactNode;
  /**
   * Clicking the scrim closes. Set false while the dialog holds unsaved input;
   * Escape and the close button still work.
   */
  dismissOnOverlay?: boolean;
  closeLabel?: string;
  children: ReactNode;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  dismissOnOverlay = true,
  closeLabel = 'Close',
  children,
}: DialogProps) {
  const depth = useContext(Depth);
  if (depth > 1 && DEV) console.error('lumux Dialog: only one level of nesting is allowed (§5.4)');
  const onCloseAutoFocus = useFocusReturn(open);
  const z = depth === 0 ? 'z-modal' : 'z-modal-top';
  const full = size === 'full';
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay
          className={cx(
            'fixed inset-0 grid bg-overlay-scrim',
            z,
            // Phones: the panel fills the screen. Desktop: centred with a 16px margin.
            full ? 'p-0' : 'items-end p-0 sm:items-center sm:justify-items-center sm:p-4',
          )}
        >
          <D.Content
            onCloseAutoFocus={onCloseAutoFocus}
            onPointerDownOutside={(e) => !dismissOnOverlay && e.preventDefault()}
            onInteractOutside={(e) => !dismissOnOverlay && e.preventDefault()}
            className={cx(
              PANEL,
              'h-full w-full max-h-full',
              full ? '' : 'sm:h-auto sm:rounded-card',
              SIZE[size],
            )}
          >
            <Depth.Provider value={depth + 1}>
              <OverlayHeader
                title={title}
                description={description}
                closeLabel={closeLabel}
                onClose={() => onOpenChange(false)}
                Title={D.Title}
                Description={D.Description}
              />
              <OverlayBody>{children}</OverlayBody>
              {footer && <OverlayFooter>{footer}</OverlayFooter>}
            </Depth.Provider>
          </D.Content>
        </D.Overlay>
      </D.Portal>
    </D.Root>
  );
}

/** Wrap the opener for a declarative open; focus return then needs no capture. */
export const DialogTrigger = D.Trigger;
/** Wrap a footer button that closes the dialog (Cancel). */
export const DialogClose = D.Close;
