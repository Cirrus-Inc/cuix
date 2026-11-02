// The map's colour tokens, in a .ts module so logic that only needs them stays loadable by node's test runner.
// Each colour resolves --cuix-map-<name> (set by the `colors` prop or by the app), then the cuix token, then the core day value.

export interface MapColors {
  surface: string;
  border: string;
  borderStrong: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  accentSoft: string;
  focusRing: string;
  danger: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
}

const TOKENS: Record<keyof MapColors, [string, string]> = {
  surface: ['surface', '#ffffff'],
  border: ['border', '#e1e6ea'],
  borderStrong: ['border-strong', '#6b7a85'],
  foreground: ['foreground', '#1a2e3a'],
  foregroundMuted: ['foreground-muted', '#2c4150'],
  accent: ['accent', '#005778'],
  accentSoft: ['accent-soft', '#e8f6fc'],
  focusRing: ['focus-ring', '#005778'],
  danger: ['danger', '#98270e'],
  chart1: ['chart-1', '#0079a8'],
  chart2: ['chart-2', '#a04e00'],
  chart3: ['chart-3', '#6b4de6'],
  chart4: ['chart-4', '#127c0a'],
};

/** Whether `name` is a `MapColors` key. */
export const isMapColor = (name: string): name is keyof MapColors => Object.hasOwn(TOKENS, name);

export const own = (name: keyof MapColors) => `--cuix-map-${TOKENS[name][0]}`;

/** The CSS value of one map colour. */
export const mapColor = (name: keyof MapColors) => `var(${own(name)}, var(--cuix-${TOKENS[name][0]}, ${TOKENS[name][1]}))`;
