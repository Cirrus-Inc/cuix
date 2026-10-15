// Theme selection and persistence. One attribute, `data-theme`, on
// <html>. No attribute means "follow the OS": tokens.css resolves it to the
// default pair with prefers-color-scheme, so a live OS change needs no listener.

import { isThemeName, schemeOf, SYSTEM_THEME, type Scheme, type ThemeName } from '../tokens/themes.ts';

export { SYSTEM_THEME, THEME_META, THEME_NAMES, isThemeName, schemeOf, type Scheme, type ThemeName } from '../tokens/themes.ts';

export type ThemeChoice = ThemeName | 'system';

export const THEME_STORAGE_KEY = 'cuix-theme';

function stored(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(v) ? v : null;
  } catch {
    return null;
  }
}

export function readTheme(): ThemeChoice {
  return stored() ?? 'system';
}

export function systemScheme(): Scheme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolvedTheme(choice: ThemeChoice = readTheme()): ThemeName {
  if (choice !== 'system') return choice;
  return SYSTEM_THEME[systemScheme()];
}

export function resolvedScheme(choice: ThemeChoice = readTheme()): Scheme {
  return schemeOf(resolvedTheme(choice));
}

export function applyTheme({ theme, persist = true }: { theme: ThemeChoice; persist?: boolean }): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  if (persist) {
    try {
      if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the theme still applies for this page view.
    }
  }

  syncThemeColor(theme);
}

// The browser chrome follows the in-app choice, not only the OS: surface in
// a light theme, background in a dark one. Takes the applied choice: with
// `persist: false` storage still holds the previous one.
export function syncThemeColor(choice: ThemeChoice = readTheme()): void {
  const dark = resolvedScheme(choice) === 'dark';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(dark ? '--cuix-background' : '--cuix-surface')
    .trim();
  if (!value) return;
  // Media-scoped tags would win over an unscoped one, so every tag gets the value.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (!metas.length) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = value;
    document.head.append(meta);
  }
  metas.forEach((meta) => (meta.content = value));
}
