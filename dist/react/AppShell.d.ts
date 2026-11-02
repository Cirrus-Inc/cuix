import { type ReactNode } from 'react';
export declare function SkipLink({ href, children }: {
    href?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
/** 2.4.2: each route names itself. `Contacts · Acme`; the app name alone when untitled. */
export declare function useDocumentTitle(title: string | undefined, app: string): void;
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
export declare function AppShell({ header, sidebar, collapsed, sidebarId, skipLabel, pane, tabs, children, className }: AppShellProps): import("react").JSX.Element;
export {};
