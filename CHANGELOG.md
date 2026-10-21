# Changelog

Every tag, newest first. Entries up to `v0.7.0` were written against the former private repository (now `Cirrus-Inc/cuix-legacy`); its issues that moved here are cited as `Cirrus-Inc/cuix#N` with their number here, everything else as `Cirrus-Inc/cuix-legacy#N`; `v0.1.0` and `v0.2.0` were tagged there only and are not installable. Install a tag with `npm i @cirrus/cuix@github:Cirrus-Inc/cuix#vX.Y.Z`. Breaking changes are token renames and removals and component API breaks; removed tokens are kept as hand-written deprecated aliases for one minor first. GitHub Releases carry the same notes, generated from merged PR titles. Every PR adds its bullet under `[Unreleased]`; `scripts/release.sh` folds them into the new tag's section.

## [Unreleased]

- fix(react): a `required` `Select` in a `<form>` shows the validation message on the trigger. Radix's hidden `<select required>` anchored the browser bubble to a 1px element; `Select` now captures `invalid` on the form, cancels that bubble, focuses the trigger (first invalid control only) and renders the browser's message under it (`role="alert"`, `aria-describedby`, `aria-invalid`). Only on a user submit (a silent `checkValidity()` neither focuses nor shows it). Empty submit is still blocked natively; a `Field` `error` takes precedence. Closes Cirrus-Inc/cuix#71

## [0.10.0] - 2026-10-15

- feat(react): `AppShell` gets `pane` and `tabs` props. `pane` (usually the new `AppShellPane`: an `<aside>` named by its `h2`, optional close button, one scroller) is a 400px column fixed on the right from `lg` up (`w-100`, no new token); the content wrapper pads for it (`lg:pr-100`). `tabs` (usually the new `BottomTabs` / `BottomTab`, 44px targets, `aria-current`) renders in flow after `main`, `sticky bottom-0 lg:hidden`. Behaviour change: the `AppShell` root is now a flex column instead of a block, with the content wrapper `flex-1`; and while `tabs` is set it sets `scroll-padding-bottom` to the bar's height so focus is never obscured (2.4.12). Completes Cirrus-Inc/cuix#33 items 2-3
- test(e2e): the tabbable-element count in the focus-ring test counts only rendered elements (breakpoint-hidden items are not in the tab order); `?tabs=1` turns the playground's tab bar on for its own tests

## [0.9.0] - 2026-10-15

- feat(react): `AppShell` collapses its sidebar to an icon rail. New `collapsed` and `sidebarId` props (controlled; the app stores the choice), `Sidebar`, `SidebarSection`, `SidebarItem` (router links through `asChild`; in rail mode the label is `sr-only` and a right-side `Tooltip` shows it), `SidebarToggle` and `useStoredBoolean` (`'1'` / `'0'` in `localStorage`, same as HIVE's `useStoredFlag`). Behaviour change: from `lg` up the sidebar column is now `fixed` under the header and the content wrapper pads for it (`lg:pl-sidebar` / `lg:pl-rail`), so it stays in view while the page scrolls instead of scrolling away; an app that padded for the column itself should drop that padding, and a custom `<nav>` passed as `sidebar` needs its own scroller (the column does not scroll; `Sidebar` has one). Side pane and bottom tabs remain (Cirrus-Inc/cuix#33 item 1 only)

## [0.8.0] - 2026-10-15

- **BREAKING** chore: the package `lumux` is now `@cirrus/cuix` and the repository moved to `Cirrus-Inc/cuix` (was `danieloceno/lumux`); no alias for the old name. Install with `"@cirrus/cuix": "github:Cirrus-Inc/cuix#vX.Y.Z"` and import from `@cirrus/cuix/react`, `@cirrus/cuix/theme`, `@cirrus/cuix/tokens.css`, `@cirrus/cuix/theme.css`, `@cirrus/cuix/eslint` (subpaths unchanged). Renamed: every CSS custom property `--lumux-*` to `--cuix-*` (including `--ease-lumux`, `--animate-lumux-spin` and the `lumux-spin` keyframes, now `--ease-cuix`, `--animate-cuix-spin`, `cuix-spin`, so the Tailwind utilities `ease-lumux` and `animate-lumux-spin` in consumer markup become `ease-cuix` and `animate-cuix-spin`); the theme storage key `lumux-theme` to `cuix-theme` (a stored choice resets once unless the app mounts `<ThemeProvider legacy={{ key: "lumux-theme" }}>` for a release); `theme-init.js` and `theme-init.sha256` change with it, so apps that inline the script must copy the new bytes and CSP hash; the gates config `lumux-gates.json` to `cuix-gates.json` and `lumux-gates.baseline.json` to `cuix-gates.baseline.json` (rename both in a consumer and the config's `baseline` key, then re-run `install-gates.sh` from its new path `node_modules/@cirrus/cuix/scripts/`; it stops while only `lumux-gates.json` exists); the env var `LUMUX_GATES` to `CUIX_GATES`; the ESLint export's conventional import name `lumuxA11y` to `cuixA11y`. Demo moved to https://cirrus-inc.github.io/cuix/

## [0.7.0] - 2026-10-14

Breaking: `Select` is now a Radix Select with an `options` prop, not a native `<select>` with `<option>` children. Forms that want the platform control rename it to `NativeSelect`, which is the previous component unchanged. `@radix-ui/react-select` joins the optional peers (`^2`): the `lumux/react` barrel imports it, so a React consumer must `npm i @radix-ui/react-select` when it moves to this release, Select user or not, or its build fails to resolve it.

- feat(tokens): `hive` family, `hive-day` (light) and `hive-night` (dark), from the HIVE mockup palette at the same AAA gate (504/504 pairs, no exception list); failing mockup values moved to the nearest passing colour and are listed in docs/tokens.md#hive-deviations. `hive-day`'s accent is ink, not coral (coral at 7:1 is brick and collides with `danger`). `theme-init.js`, its sha256, `ThemeSwitcher` labels (`Hive Day`, `Hive Night`) and the playground cover both; `SYSTEM_THEME` is unchanged. Apps that inline `theme-init.js` must copy the new bytes and CSP hash (Cirrus-Inc/cuix#34)
- feat(react): `Select` on `@radix-ui/react-select`: the same themed popup in every browser (Safari's native popup followed the OS), items styled like `Menu` (44px, tokens, check on the selected one, `forced-selected` in forced colors), chevron trigger, `Field` wiring through the same props as `Input` so the label focuses the trigger; the native control stays as `NativeSelect` (Cirrus-Inc/cuix#35)
- chore(ci): `consumer-smoke` job (`npm run smoke:consumer`, also run by `scripts/release.sh` before tagging) packs the package, installs the tarball into a Vite + React 19 + Tailwind 4 app (`tests/consumer`) and fails on a missing `exports` target, types that do not resolve under `moduleResolution: bundler`, component classes Tailwind does not find, or an SSR `renderToString` of any exported component that breaks (Cirrus-Inc/cuix-legacy#27)
- docs: README accuracy pass for v0.5.0
- docs: getting-started covers the `git` a Docker builder stage needs for the GitHub pin, `ThemeProvider` wrapping unauthenticated pages, the byte-exact `theme-init.sha256` (trailing newline, no `trim()`), and monorepo installs that nest lumux under the workspace (Cirrus-Inc/cuix#40)
- chore(release): `scripts/release.sh` folds `[Unreleased]` into a dated `[X.Y.Z]` section with its release link (`scripts/fold-changelog.sh`), opens a fresh `[Unreleased]`, commits `CHANGELOG.md` on the release commit and fails when `[Unreleased]` has no bullets (Cirrus-Inc/cuix#36)

## [0.5.0] - 2026-10-14

- fix(react): `Checkbox` and `RadioGroup` draw their box, circle and checked mark with tokens (`border-strong` edge, `danger` when invalid, `accent` / `accent-foreground` when checked, a dash for `indeterminate`) instead of the browser's `accent-color` rendering, and `check:contrast` derives control edges (`border-*`) at 3:1, so 1.4.11 is verified in all six themes (Cirrus-Inc/cuix#44)
- fix(react): the `danger-outline` `Button` hover uses `danger-on-soft` on `danger-soft` (7.06:1 in `midnight`, was 6.69:1); `check:contrast` now derives the fg/bg pairs components render, per state, from their class strings and fails on any pair `PAIRS` does not list (Cirrus-Inc/cuix#54)
- fix(tokens): `forced-selected` wins over `bg-*` / `text-*` in forced colors, so the selected `SegmentedControl` segment and `ThemeSwitcher` button are painted `Highlight` / `HighlightText` as documented (Chromium kept `bg-accent`)
- chore(test): `E2E_PORT` moves the Playwright server off 5179, so a second worktree tests its own code
- fix(react): `Dialog`, `Sheet` and `Drawer` return focus to the clicked opener in Safari, which does not focus a clicked button, by falling back to the pointer target when nothing was focused at open (Cirrus-Inc/cuix#39)
- fix(tooling): `install-gates.sh` rejects a `--src` / `--ui` value that starts with `--`, so `--src --ui x` is a usage error
- fix(react): a `Menu` item `id` with whitespace no longer breaks the disabled reason's `aria-describedby`; the reason's element id is built from the item index
- chore(ci): workflow action SHA pin comments name the exact version (checkout and setup-node v4.4.0, upload-pages-artifact v3.0.1, deploy-pages v4.0.5)
- docs: reconcile docs with code: `ConfirmInline` anatomy and focus after `onConfirm`, axe covers resting states only, the token alias policy is a rule for authors, not a build feature (Cirrus-Inc/cuix#47)
- fix(react): a `Toast` with an `action` no longer auto-dismisses (an Undo is a function with a time limit, WCAG 2.2.1 / 2.2.3); it is announced with an action hint ("Entry deleted. Undo available.", `ToastLabels.actionHint` is optional); the polite and assertive live regions are emptied 5 s after the last toast of their kind is gone; `ToastItem.seq` is marked `@internal`; a full stack pushes out the oldest toast without an action before an Undo (Cirrus-Inc/cuix#52)

## [0.4.0] - 2026-10-14

Breaking: `ToastItem` (returned by `useToastLog()`) gained a required `seq: number`. Code that builds `ToastItem` values by hand, such as test fixtures, must add it; `ToastProvider` sets it. It is internal and is marked so from the next release.

- docs(react): document that the native `Select` popup follows the page `color-scheme` in Chrome and the OS in Safari and mobile pickers, and test the scheme without `data-theme` (Cirrus-Inc/cuix#41)
- feat(react): add `headingLevel` (2-6, default 3) to `Card` so its title fits the page heading outline (Cirrus-Inc/cuix#45)
- fix(react): `Field` labels the control by its own `id` when it has one, so `<Field label="Email"><Input id="email" /></Field>` keeps its accessible name (Cirrus-Inc/cuix#50)
- fix(react): a third nested `Dialog` logs a dev-only `console.error` instead of throwing, so production bundles never unmount the tree (Cirrus-Inc/cuix#56)
- fix(react): `ToastProvider` renders persistent polite and assertive live regions and writes each toast into them, so success and info toasts are announced reliably; the visible toast no longer carries a live role (Cirrus-Inc/cuix#57)
- fix(tokens): `theme.css` ships `@source "./react"`, so consumers no longer add a `node_modules` path to their CSS and overlays cannot render unstyled from a wrong path (Cirrus-Inc/cuix#55)
- docs: document the full provider stack (`TooltipProvider`, `ToastProvider`), a Vite recipe that injects `theme-init.js`, a new product checklist and HIVE as a consumer; ship `dist/theme-init.sha256` (`lumux/theme-init.sha256`) as the CSP hash (Cirrus-Inc/cuix#53)
- chore(tooling): `install-gates.sh` reports a missing `--src` / `--ui` value, surfaces the gate's error when the baseline cannot be written, and says when `--src` / `--ui` are ignored; `ThemeProvider` follows theme changes from other tabs; `Menu` items accept an optional `id` key; add `sideEffects` to `package.json` (Cirrus-Inc/cuix#43)
- chore(ci): least-privilege `permissions`, `concurrency` and commit-SHA-pinned actions in the workflows; add grouped Dependabot updates (npm weekly, github-actions monthly); run the overlay e2e specs on WebKit as well as Chromium; the focus-return specs open their dialog by keyboard because WebKit does not focus a clicked button (Cirrus-Inc/cuix#46)

## [0.3.0] - 2026-10-08

Phase 2 complete: overlays, content and feedback components, own `ToastProvider` (no sonner), three installable gates via `scripts/install-gates.sh`.

- feat(gates): installable gates and component docs (Cirrus-Inc/cuix-legacy#16)
- feat(react): content and feedback: Card, Badge, EmptyState, ConfirmInline, Toast (Cirrus-Inc/cuix-legacy#15)
- chore(demo): publish the playground to GitHub Pages from main (Cirrus-Inc/cuix-legacy#14)
- feat(react): overlays: Dialog, Sheet, Drawer, Tooltip, Menu, Popover (Cirrus-Inc/cuix-legacy#13)
- Sync community files, `ARCHITECTURE.md` and the README License / Roadmap sections from `Cirrus-Inc/cuix`; `scripts/release.sh` can now cut a tag at the current `package.json` version.
- Add MIT `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` and this changelog; add package metadata (`license`, `repository`, `homepage`, `bugs`, `description`, `keywords`).
- Remove internal analysis prompts and private product inventories from the repository and from `ARCHITECTURE.md`; the install no longer mentions private-repo access.
- Add `CODEOWNERS`, a pull request template and bug / feature issue templates.
- chore(release): sync the install pin and release notes on release (Cirrus-Inc/cuix-legacy#18)

## 0.2.0 - 2026-10-08

Six named themes (core day/night + extended dawn/midnight/forest/ocean) at AAA, Phase 2a foundation and 2b forms, `/eslint` config, `tokens.host.css`.

- docs(tokens): sync README and docs with the six-theme system (Cirrus-Inc/cuix-legacy#10)
- feat(tokens): six themes: core pair + extended four at AAA (Cirrus-Inc/cuix-legacy#9)
- feat(react): forms (Cirrus-Inc/cuix-legacy#8)
- feat(tokens): square radius: control 4, inset 2, card 8, no pill chips (Cirrus-Inc/cuix-legacy#7)
- feat(react): React foundation, Button family, a11y harness (Cirrus-Inc/cuix-legacy#6)
- feat(tokens): add `tokens.host.css` for shadow-root consumers (Cirrus-Inc/cuix-legacy#5)

## 0.1.0 - 2026-10-04

Phase 1: core day/night tokens at AAA, generated `tokens.css` / `theme.css` / `tokens.embed.css`, contrast gate.

- feat(tokens): core tokens, generated CSS, AAA contrast gate (Cirrus-Inc/cuix-legacy#3)
- docs(tokens): adopt core day/night as the only palette at AAA (Cirrus-Inc/cuix-legacy#2)
- docs: README with Mermaid, badges and decision index (Cirrus-Inc/cuix-legacy#1)

[Unreleased]: https://github.com/Cirrus-Inc/cuix/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.10.0
[0.9.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.9.0
[0.8.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.8.0
[0.7.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.7.0
[0.5.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.5.0
[0.4.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.4.0
[0.3.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.3.0
