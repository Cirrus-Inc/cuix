import type { ReactNode } from 'react';
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
export declare function AppShellPane({ title, id, onClose, closeLabel, children }: AppShellPaneProps): import("react").JSX.Element;
