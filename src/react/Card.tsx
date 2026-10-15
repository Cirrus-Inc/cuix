'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx.ts';

export type CardRail = 'none' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

// The left edge is written per side, width and colour together, so it never
// races the all-sides `border` shorthand in the stylesheet.
const RAIL: Record<CardRail, string> = {
  none: 'border-l border-l-border',
  accent: 'border-l-4 border-l-accent',
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-danger',
  info: 'border-l-4 border-l-info',
};

export type CardProps = {
  as?: 'div' | 'li' | 'article' | 'section';
  /** `flat` by default: a bordered card with a shadow is two separations doing one job. `raised` floats (drag preview). */
  elevation?: 'flat' | 'raised';
  /** Status or brand colour on the left edge. The meaning is in the content; the rail is a cue. */
  rail?: CardRail;
  /** Optional header: a `heading`-role title and an action slot on the right. */
  title?: ReactNode;
  /** Heading level of `title`, to fit the page outline. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  action?: ReactNode;
  footer?: ReactNode;
  /** `none` when the children carry their own padding (a divided list). */
  pad?: 'default' | 'none';
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'title' | 'className' | 'children'>;

// Card: surface, 1px border, radius-card, padding 16 (dense 12 via --cuix-card-padding).
export function Card({
  as: Tag = 'div',
  elevation = 'flat',
  rail = 'none',
  title,
  headingLevel = 3,
  action,
  footer,
  pad = 'default',
  className,
  children,
  ...rest
}: CardProps) {
  const Heading = `h${headingLevel}` as const;
  const padding = pad === 'default' ? 'p-card' : '';
  return (
    <Tag
      className={cx(
        'flex flex-col rounded-card border-t border-r border-b border-border bg-surface text-foreground',
        RAIL[rail],
        elevation === 'raised' ? 'shadow-overlay' : 'shadow-flat',
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <div className={cx('flex items-start gap-2 border-b border-border', padding || 'p-card')}>
          {title && <Heading className="min-w-0 flex-1 text-subheading">{title}</Heading>}
          {action && <div className="-m-2 ml-auto shrink-0">{action}</div>}
        </div>
      )}
      <div className={cx('min-w-0 flex-1', padding)}>{children}</div>
      {footer && <div className={cx('border-t border-border', padding || 'p-card')}>{footer}</div>}
    </Tag>
  );
}
