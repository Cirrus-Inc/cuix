# Getting started

How an app adopts lumux, start to finish. Ten minutes for a Vite or Next app that already
runs Tailwind v4. The reference page is `playground/` in this repo: it does every step below.

## 0. Prerequisites

- Tailwind **v4**. An app on v3 upgrades first.
- React 19 if you want the components. Tokens alone need nothing.

## 1. Install

```sh
npm i github:danieloceno/lumux#v0.3.0
npm i react react-dom lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-popover   # React peers
npm i -D eslint-plugin-jsx-a11y                              # lint peer
npm i @fontsource-variable/inter                             # the font; `geist` too if you use the `data` type role
```

Pin a tag, never a branch. Upgrades are deliberate: bump the tag, re-run `install-gates.sh`, run your gates.

## 2. CSS

```css
/* app.css */
@import "tailwindcss";
@import "lumux/tokens.css";   /* custom properties: six themes, type, spacing, focus, motion */
@import "lumux/theme.css";    /* Tailwind v4 @theme: bg-surface, text-body, rounded-control, min-h-target … */
@import "@fontsource-variable/inter";
```

Order matters: `tokens.css` before `theme.css`. `theme.css` also declares `@source "./react"`
(relative to itself), so Tailwind finds the component classes wherever the package is installed.
Only an app that vendors `dist/react` somewhere else adds its own `@source` for that copy.

## 3. `<head>`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
<!-- the contents of node_modules/lumux/dist/theme-init.js, inline, before any CSS -->
<script>try{var t=localStorage.getItem("lumux-theme");if(["day","night","dawn","midnight","forest","ocean"].indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
```

Never `maximum-scale` or `user-scalable=no`. The inline script is what stops a stored
dark theme from flashing light on load; `ThemeProvider` keeps `theme-color` in step after that.

## 4. React root

```tsx
import { AppShell, IconProvider, ThemeProvider, ThemeSwitcher, THEME_NAMES } from "lumux/react";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider legacy={{ key: "app-theme" }} /* optional: migrates an old key once */>
    <IconProvider>
      <AppShell
        header={<><Logo /><ThemeSwitcher themes={THEME_NAMES} className="ml-auto" /></>}
        sidebar={<Nav />}
      >
        <Routes />
      </AppShell>
    </IconProvider>
  </ThemeProvider>,
);
```

- `AppShell` gives you the skip link, the `<header>` / `<main id="main">` landmarks and safe
  areas. Keep your own navigation inside it; lumux ships primitives, not shells.
- `ThemeSwitcher` without `themes` offers the default pair plus System. Pass `THEME_NAMES` for all six.
  An app that pins one theme sets `data-theme` on `<html>` and mounts no switcher.
- Each route calls `useDocumentTitle("Contacts", "Acme")`.

Without React: `import { applyTheme, readTheme } from "lumux/theme"` does the same
selection and persistence, framework-free.

## 5. Build screens

Use the utilities `theme.css` defines and nothing else for appearance:

| Need | Write | Never |
|---|---|---|
| Canvas, card, input well | `bg-background`, `bg-surface`, `bg-surface-raised` | `bg-white`, `bg-slate-50`, a hex |
| Text | `text-foreground`, `text-foreground-muted`, `text-foreground-subtle` | `text-gray-500`, opacity on text |
| Control edge | `border-border-strong` | `border-border` on an input (decorative only, fails 3:1) |
| Tinted badge or chip | `bg-accent-soft text-accent-on-soft` | `bg-accent/10` behind text |
| Type | `text-display` … `text-body` … `text-label` | `text-sm` with its own `leading-*` |
| Size of anything clickable | `min-h-target min-w-target` (44px) | `h-8`, `size-icon` |
| Corners | `rounded-control`, `rounded-card`, `rounded-pill` (switch tracks, avatars only) | `rounded-md`, `rounded-full` on a chip |
| Layers, motion | `z-modal`, `duration-base ease-lumux` | `z-[999]`, `duration-200` |

Status never travels by colour alone (icon or word with it). Helper text ≤90 characters.
Full token reference: [tokens.md](./tokens.md). Component contracts: [components.md](./components.md).
Copy rules: [copy.md](./copy.md).

App-only colours (pipeline states, an `onair` indicator) go in the app's own file as
namespaced custom properties (`--app-*`), authored for every theme the app offers, with their own
contrast test. lumux never learns them.

## 6. Lint

```js
// eslint.config.js
import lumuxA11y from "lumux/eslint";
export default [...lumuxA11y /*, your config */];
```

## 7. Gates

```sh
bash node_modules/lumux/scripts/install-gates.sh --src src        # add --ui <dir> if you keep your own primitives
npm run check:gates
```

Copies the three gates into `scripts/`, freezes today's drift counts as the baseline and adds
`check:gates` to `package.json`. Commit it and run it in CI. Re-run after each lumux upgrade.
Details: [gates.md](./gates.md).

## 8. CI

- Run your own axe / Playwright pass in every theme you offer. lumux guarantees its components in
  all six; your layouts are yours.

## 9. Without React, or inside a shadow root

| Case | Import | Notes |
|---|---|---|
| Plain page, any framework | `tokens.css` + `theme.css` (if Tailwind) | `data-theme` on `<html>` as above |
| UI inside a shadow root (e.g. an embedded studio) | `tokens.host.css` | Every token on `:host`, no base rules. `data-theme` on the shadow host; bring your own `:focus-visible` rule (copy the one in `tokens.md` → Focus) |
| A lightweight embed snippet | `tokens.embed.css` | 16 tokens, default pair only, follows the host OS, never persists; `--lumux-embed-accent` is the one host override |

## 10. Upgrading

Bump the tag. Breaking changes are token renames and removals; they ship as deprecated aliases
for one minor first. Read the tag's notes, run your gates, done.
