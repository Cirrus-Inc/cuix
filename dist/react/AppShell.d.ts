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
    children: ReactNode;
    className?: string;
};
export declare function AppShell({ header, sidebar, collapsed, sidebarId, skipLabel, children, className }: AppShellProps): import("react").JSX.Element;
export {};
