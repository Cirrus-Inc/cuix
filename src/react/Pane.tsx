'use client';

import { PanelRightClose } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './Button.tsx';

export type AppShellPaneProps = {
  /** The pane's heading (h2) and its accessible name. */
  title: string;
  /** The landmark's id: point the app's toggle `aria-controls` at it. */
  id?: string;
  /** Renders a close button. The app owns the open state and returns focus to its opener. */
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
};

// Pass as AppShell's `pane`. A complementary landmark named by its heading
// (landmarks, 2.4.1); the body is the pane's one scroller, the header stays put.
export function AppShellPane({ title, id = 'pane', onClose, closeLabel = 'Hide panel', children }: AppShellPaneProps) {
  const titleId = `${id}-title`;
  return (
    <aside id={id} aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col border-l border-border bg-surface">
      <div className="flex min-h-header items-center gap-2 border-b border-border px-4">
        <h2 id={titleId} className="flex-1 text-heading">
          {title}
        </h2>
        {onClose && (
          <IconButton variant="ghost" icon={<PanelRightClose className="size-5" aria-hidden="true" />} aria-label={closeLabel} onClick={onClose} />
        )}
      </div>
      {/* scroll-ok: the pane body scrolls on its own, beside a page that scrolls with the window */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
