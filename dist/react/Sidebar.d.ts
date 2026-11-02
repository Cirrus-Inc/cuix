import { type AnchorHTMLAttributes, type ReactElement, type ReactNode } from 'react';
export declare const CollapsedContext: import("react").Context<boolean>;
export type SidebarProps = {
    /** The <nav> landmark's accessible name. */
    label?: string;
    /** Icon rail: items show their icon only. Defaults to AppShell's `collapsed`. */
    collapsed?: boolean;
    /** Below the scroller, behind a top border: an app's menus or the SidebarToggle. */
    footer?: ReactNode;
    children: ReactNode;
};
export declare function Sidebar({ label, collapsed: own, footer, children }: SidebarProps): import("react").JSX.Element;
export type SidebarSectionProps = {
    /** Named for assistive tech always; drawn only while the sidebar is expanded. */
    label?: string;
    children: ReactNode;
};
export declare function SidebarSection({ label, children }: SidebarSectionProps): import("react").JSX.Element;
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
export declare function SidebarItem({ icon, label, count, current, asChild, className, children, ...rest }: SidebarItemProps): import("react").JSX.Element;
export type SidebarToggleProps = {
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    /** The id of the element it resizes: AppShell's `sidebarId`. */
    controls?: string;
    labels?: {
        expand: string;
        collapse: string;
    };
};
export declare function SidebarToggle({ collapsed, onCollapsedChange, controls, labels, }: SidebarToggleProps): import("react").JSX.Element;
/**
 * A boolean kept in localStorage as '1' / '0'. On the server, and when storage
 * throws, it returns `initial`; the client reads storage on first render, so an
 * SSR app that hydrates a stored `true` mismatches once.
 */
export declare function useStoredBoolean(key: string, initial: boolean): [boolean, (value: boolean) => void];
