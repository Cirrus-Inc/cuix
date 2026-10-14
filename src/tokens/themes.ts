// The theme registry: every value `data-theme` accepts and whether it is a
// light or a dark scheme. Names only, no colours, so the runtime (`/theme`)
// stays tiny. The colours live in sets/ and are joined in sets/index.ts.
//
// Three families:
//   core     day / night         the default pair: ink and deep blue
//   extended dawn / midnight     warm paper + violet; deep dark + violet
//            forest / ocean      green on paper; navy with cyan
//   hive     hive-day / hive-night  the HIVE mockup palette: paper + ink; ink-deep + coral
// `system` resolves to the default pair. Every theme passes the same AAA gate.

export type Scheme = 'light' | 'dark';

export const THEME_META = {
  day: { scheme: 'light', family: 'core' },
  night: { scheme: 'dark', family: 'core' },
  dawn: { scheme: 'light', family: 'extended' },
  midnight: { scheme: 'dark', family: 'extended' },
  forest: { scheme: 'light', family: 'extended' },
  ocean: { scheme: 'dark', family: 'extended' },
  'hive-day': { scheme: 'light', family: 'hive' },
  'hive-night': { scheme: 'dark', family: 'hive' },
} as const satisfies Record<string, { scheme: Scheme; family: string }>;

export type ThemeName = keyof typeof THEME_META;

export const THEME_NAMES = Object.keys(THEME_META) as ThemeName[];

export const SYSTEM_THEME: Record<Scheme, ThemeName> = { light: 'day', dark: 'night' };

export function isThemeName(v: unknown): v is ThemeName {
  return typeof v === 'string' && Object.hasOwn(THEME_META, v);
}

export function schemeOf(theme: ThemeName): Scheme {
  return THEME_META[theme].scheme;
}
