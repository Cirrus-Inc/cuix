// Every theme with its colours, keyed by the `data-theme` value. build-tokens,
// check-contrast and the tests iterate this; nothing else should.

import type { ThemeColors } from '../vocabulary.ts';
import { THEME_META, type Scheme, type ThemeName } from '../themes.ts';
import { core } from './core.ts';
import { dawn, forest, midnight, ocean } from './extended.ts';
import { hiveDay, hiveNight } from './hive.ts';

const COLORS: Record<ThemeName, ThemeColors> = {
  day: core.day,
  night: core.night,
  dawn,
  midnight,
  forest,
  ocean,
  'hive-day': hiveDay,
  'hive-night': hiveNight,
};

export const THEMES: Record<ThemeName, { scheme: Scheme; colors: ThemeColors }> = Object.fromEntries(
  (Object.keys(THEME_META) as ThemeName[]).map((name) => [
    name,
    { scheme: THEME_META[name].scheme, colors: COLORS[name] },
  ]),
) as Record<ThemeName, { scheme: Scheme; colors: ThemeColors }>;
