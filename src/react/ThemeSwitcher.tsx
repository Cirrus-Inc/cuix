'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { schemeOf, SYSTEM_THEME, type ThemeChoice, type ThemeName } from '../theme/index.ts';
import { cx } from './cx.ts';
import { useTheme } from './ThemeProvider.tsx';

export type ThemeSwitcherLabels = Partial<Record<ThemeChoice, string>> & { group?: string };

const DEFAULT_LABELS: Required<ThemeSwitcherLabels> = {
  group: 'Theme',
  day: 'Day',
  night: 'Night',
  dawn: 'Dawn',
  midnight: 'Midnight',
  forest: 'Forest',
  ocean: 'Ocean',
  'hive-day': 'Hive Day',
  'hive-night': 'Hive Night',
  system: 'System',
};

// Labelled toggles rather than one cycling icon: the current choice and the
// alternatives are both readable without trying them. The default offers the
// default pair; an app that ships more lists them in `themes`.
export function ThemeSwitcher({
  themes = [SYSTEM_THEME.light, SYSTEM_THEME.dark],
  system = true,
  labels,
  className,
}: {
  themes?: readonly ThemeName[];
  /** Offer "follow the OS". Off for an app that pins its themes. */
  system?: boolean;
  labels?: ThemeSwitcherLabels;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const text = { ...DEFAULT_LABELS, ...labels };
  const options: ThemeChoice[] = system ? [...themes, 'system'] : [...themes];
  // Icons alone tell themes apart only when each scheme appears once (one sun, one moon).
  const iconsDistinct = new Set(themes.map(schemeOf)).size === themes.length;
  return (
    <div
      role="group"
      aria-label={text.group}
      className={cx('inline-flex flex-wrap gap-0.5 rounded-control bg-surface-raised p-0.5', className)}
    >
      {options.map((value) => {
        const pressed = theme === value;
        const Icon = value === 'system' ? Monitor : schemeOf(value) === 'dark' ? Moon : Sun;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setTheme(value)}
            className={cx(
              'inline-flex min-h-target min-w-target items-center justify-center gap-2 rounded-inset px-3 text-body-sm font-medium transition-colors duration-fast ease-lumux',
              pressed ? 'forced-selected bg-accent text-accent-foreground' : 'text-foreground hover:bg-surface',
            )}
          >
            <Icon aria-hidden="true" />
            {/* Below sm the label stays the accessible name but is not drawn when the icons are distinct:
                three labelled toggles don't fit 320px. With repeated icons the labels stay visible and the row wraps. */}
            <span className={iconsDistinct ? 'sr-only sm:not-sr-only' : undefined}>{text[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
