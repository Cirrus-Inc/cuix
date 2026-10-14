'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyTheme,
  isThemeName,
  readTheme,
  resolvedTheme,
  schemeOf,
  syncThemeColor,
  SYSTEM_THEME,
  THEME_STORAGE_KEY,
  type Scheme,
  type ThemeChoice,
  type ThemeName,
} from '../theme/index.ts';

type ThemeContextValue = {
  theme: ThemeChoice;
  /** The theme on screen: the choice, or the default pair when the choice is `system`. */
  resolved: ThemeName;
  /** `light` or `dark`, for anything that is not a token (chart libraries, map tiles). */
  scheme: Scheme;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * A pre-lumux theme key to migrate once. If the old names are already lumux names,
 * no map is needed: `{ key: 'app-theme' }`. A `map` translates other
 * vocabularies, e.g. `{ light: 'day', dark: 'night' }`.
 */
export type LegacyTheme = { key: string; map?: Record<string, ThemeName> };

function migrate(legacy: LegacyTheme): ThemeChoice | null {
  try {
    const old = localStorage.getItem(legacy.key);
    localStorage.removeItem(legacy.key);
    if (old === null || localStorage.getItem(THEME_STORAGE_KEY) !== null) return null;
    const next = legacy.map ? legacy.map[old] : old;
    return isThemeName(next) ? next : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children, legacy }: { children: ReactNode; legacy?: LegacyTheme }) {
  // 'system' on the server and the first client render; theme-init.js has
  // already put the stored theme on <html>, so nothing flashes meanwhile.
  const [theme, setThemeState] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<ThemeName>(SYSTEM_THEME.light);

  useEffect(() => {
    const migrated = legacy ? migrate(legacy) : null;
    if (migrated) applyTheme({ theme: migrated });
    const current = migrated ?? readTheme();
    setThemeState(current);
    setResolved(resolvedTheme(current));
    syncThemeColor();
    // Mount only: the legacy key is read once.
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolved(SYSTEM_THEME[mq.matches ? 'dark' : 'light']);
      syncThemeColor();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== THEME_STORAGE_KEY) return;
      const next = readTheme();
      applyTheme({ theme: next, persist: false });
      setThemeState(next);
      setResolved(resolvedTheme(next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    applyTheme({ theme: next });
    setThemeState(next);
    setResolved(resolvedTheme(next));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, scheme: schemeOf(resolved), setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
