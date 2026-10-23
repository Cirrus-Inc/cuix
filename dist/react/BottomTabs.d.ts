import { type AnchorHTMLAttributes, type ReactElement, type ReactNode } from 'react';
export type BottomTabsProps = {
    /** The <nav> landmark's accessible name. */
    label?: string;
    /** Three to five `BottomTab`s; nothing enforces it. */
    children: ReactNode;
};
export declare function BottomTabs({ label, children }: BottomTabsProps): import("react").JSX.Element;
export type BottomTabProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
    /** A lucide icon element; the tab sizes it (size-5) and hides it from assistive tech. */
    icon: ReactNode;
    /** The accessible name, always drawn under the icon. */
    label: string;
    /** The current page: sets aria-current="page". */
    current?: boolean;
    /** Render the child (a router Link, empty) with the tab's look and content. */
    asChild?: boolean;
    children?: ReactElement;
};
export declare function BottomTab({ icon, label, current, asChild, className, children, ...rest }: BottomTabProps): import("react").JSX.Element;
