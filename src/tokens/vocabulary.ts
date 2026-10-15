// The colour vocabulary every set must fill, and the pairings that are legal to
// combine. check-contrast reads PAIRS; build-tokens reads COLOR_TOKENS. A pair
// that is not listed here is not legal in a component.

export const STATUSES = ['success', 'warning', 'danger', 'info'] as const;
export const CHARTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export const COLOR_TOKENS = [
  'background',
  'surface',
  'surface-raised',
  'foreground',
  'foreground-muted',
  'foreground-subtle',
  'border',
  'border-strong',
  'accent',
  'accent-strong',
  'accent-foreground',
  'accent-soft',
  'accent-on-soft',
  ...STATUSES.flatMap((s) => [s, `${s}-foreground`, `${s}-soft`, `${s}-on-soft`] as const),
  // Hover and pressed fill of a danger button. Only danger gets one: it is the
  // only status that is a button variant.
  'danger-strong',
  'focus-ring',
  'overlay-scrim',
  ...CHARTS,
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ThemeColors = Record<ColorToken, string>;
// The default pair, authored together. the extended themes are single ThemeColors;
// the registry in themes.ts carries every theme's name and scheme.
export type CoreMode = 'day' | 'night';
export type ColorSet = Record<CoreMode, ThemeColors>;

// AAA 1.4.6 for every text pair: cuix has no large-text-only pairing, so 7:1
// applies to all of them. AA 1.4.11 for boundaries, focus rings and chart marks.
export const TEXT_MIN = 7;
export const NON_TEXT_MIN = 3;

export type Pair = { fg: ColorToken; bg: ColorToken; min: number; use: string };

export const SURFACES = ['background', 'surface', 'surface-raised'] as const;
const TEXT_ON_SURFACES = [
  'foreground',
  'foreground-muted',
  'foreground-subtle',
  'accent',
  ...STATUSES,
] as const;

export const PAIRS: Pair[] = [
  ...TEXT_ON_SURFACES.flatMap((fg) =>
    SURFACES.map((bg) => ({ fg, bg, min: TEXT_MIN, use: 'text' })),
  ),
  { fg: 'accent-foreground', bg: 'accent', min: TEXT_MIN, use: 'label on filled button' },
  { fg: 'accent-foreground', bg: 'accent-strong', min: TEXT_MIN, use: 'label on hovered button' },
  { fg: 'danger-foreground', bg: 'danger-strong', min: TEXT_MIN, use: 'label on hovered danger button' },
  { fg: 'accent-on-soft', bg: 'accent-soft', min: TEXT_MIN, use: 'selected chip, tinted badge' },
  { fg: 'foreground', bg: 'accent-soft', min: TEXT_MIN, use: 'body text in a tinted card' },
  { fg: 'background', bg: 'foreground', min: TEXT_MIN, use: 'tooltip (inverted)' },
  ...STATUSES.flatMap((s) => [
    { fg: `${s}-foreground` as ColorToken, bg: s as ColorToken, min: TEXT_MIN, use: 'label on status fill' },
    { fg: `${s}-on-soft` as ColorToken, bg: `${s}-soft` as ColorToken, min: TEXT_MIN, use: 'status text on its tint' },
    { fg: 'foreground' as ColorToken, bg: `${s}-soft` as ColorToken, min: TEXT_MIN, use: 'body text in a status banner' },
  ]),
  ...SURFACES.flatMap((bg) => [
    { fg: 'border-strong' as ColorToken, bg, min: NON_TEXT_MIN, use: 'control edge' },
    { fg: 'focus-ring' as ColorToken, bg, min: NON_TEXT_MIN, use: 'focus ring' },
    ...CHARTS.map((fg) => ({ fg, bg, min: NON_TEXT_MIN, use: 'chart mark' })),
  ]),
];
