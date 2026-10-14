# lumux tokens

What each token means, when to use it, and what never to do with it. The source is
`src/tokens/`; `npm run build` generates `dist/`. Never edit `dist/`.

## Using them

```css
/* app.css */
@import "tailwindcss";
@import "lumux/tokens.css";
@import "lumux/theme.css";
```

```html
<head>
  <script>/* contents of lumux/theme-init.js, inline, before any CSS */</script>
</head>
```

- In CSS, every token is a custom property prefixed `--lumux-` (`var(--lumux-surface)`). The prefix keeps lumux from colliding with an app's existing `--background` / `--accent` during a migration.
- In Tailwind, utilities are unprefixed: `bg-surface`, `text-foreground-muted`, `border-border-strong`, `rounded-control`, `text-body`, `h-target`.
- Opacity modifiers work (`bg-accent/10`), but a tinted fill is not a legal text background unless it is a `*-soft` token. Use `accent-soft`, never `accent/10`, behind text.

## Theme

| | |
|---|---|
| Attribute | `data-theme` on `<html>`, one of six names (table below). Absent = follow the OS, live, through `prefers-color-scheme`, with the default pair (`day` / `night`). Any element can carry it to flip its subtree. |
| Persistence | `localStorage["lumux-theme"]`, one of the six names. No key = system. |
| Runtime | `import { applyTheme, readTheme, resolvedTheme, resolvedScheme, THEME_NAMES } from "lumux/theme"`. `applyTheme({ theme: "ocean" })` sets the attribute, persists the choice and updates `<meta name="theme-color">`. `{ theme: "system" }` clears both. `persist: false` applies without storing it. `resolvedScheme()` answers `light` / `dark` for anything that is not a token. |
| Pre-paint | `theme-init.js` reads the key and sets the attribute before first paint. Without it, a stored dark theme flashes light on load. `theme-init.sha256` is its CSP `script-src` hash ([getting-started.md](./getting-started.md)). |
| Pinning | An app that offers only some themes lists them in `<ThemeSwitcher themes={…}>`; an app that must stay in one (an embed) sets `data-theme` and doesn't mount a switcher. The token files always carry all six. |
| Embeds | `tokens.embed.css`: a `:host` block with 16 tokens that follows the host's `prefers-color-scheme` and never persists. |
| Shadow roots | `tokens.host.css`: every token on `:host`, no base rules, so nothing leaks onto the host page. Put `data-theme` on the shadow host; without it the OS decides. Bring your own focus rule inside the shadow root (copy the one under Focus). |

`color-scheme` is set per theme, so native scrollbars, form controls and the canvas follow it.

### The six themes

| `data-theme` | Scheme | Family | Canvas / surface | Accent | Character |
|---|---|---|---|---|---|
| `day` | light | core | `#f6f8fa` / `#ffffff` | `#005778` | Ink and deep blue. The `system` light theme. |
| `night` | dark | core | `#0a1d2a` / `#112634` | `#00cde0` | Deep navy and cyan. The `system` dark theme. |
| `dawn` | light | extended | `#fdfcfb` / `#ffffff` | `#4326d5` | Warm paper, violet. |
| `midnight` | dark | extended | `#0e0e11` / `#17171c` | `#b69ffa` | Near-black, violet. |
| `forest` | light | extended | `#f3f6f5` / `#ffffff` | `#1a5a3a` | Green on paper; its amber accent is `warning`. |
| `ocean` | dark | extended | `#0f131a` / `#171d26` | `#24c0f3` | Navy, cyan; its violet accent is `info`. |

The extended four keep their source palettes' hue and saturation in every value and move only lightness until the pair passes (`src/tokens/sets/extended.ts` lists what moved). A dark theme's accent at 7:1 on near-black is pale by necessity: `midnight` reads lavender, not the violet glow of the 4:1 original.

Every app gets the same six in `tokens.css`; which ones it *offers* is the switcher's `themes` prop. Most apps offer the default pair; some offer all six.

## Colour

Every text pair below passes **7:1** in all six themes and every boundary passes **3:1**: `npm run check:contrast` enforces it with no exception list. A pair that isn't listed in `src/tokens/vocabulary.ts` (`PAIRS`) is not legal. To add one, add it there and make it pass.

### Surfaces

| Token | Use | Not for |
|---|---|---|
| `background` | The app canvas behind everything | Cards; anything that must read as an object |
| `surface` | Cards, panels, sheets, dialogs, the header | |
| `surface-raised` | Inputs, hover and active rows, the sidebar, segmented-control wells | Large areas of body text in a light theme. It works, but it is the 7:1 floor every text colour is fitted to, so prefer `surface`. |

### Text

| Token | Use | Not for |
|---|---|---|
| `foreground` | Body text, headings, values | |
| `foreground-muted` | Secondary text: metadata, helper text, table headers | The only text on a screen |
| `foreground-subtle` | Tertiary text: timestamps, counts, placeholders | Anything the user must read to finish the task |

All three pass 7:1 on all three surfaces in every theme. The hierarchy is in the ratio (about 14, 10 and 7), not in passing or failing.

### Lines

| Token | Use | Not for |
|---|---|---|
| `border` | Decorative separation: card edges, dividers, table rules | **The edge of a control.** It has no contrast requirement and fails 3:1. **Never text.** |
| `border-strong` | The edge of an input, checkbox, select or outline button (1.4.11, 3:1) | Text |

### Accent

| Token | Use |
|---|---|
| `accent` | Links, the primary button's fill, the selected state, icon-only active state. It is also valid as text on any surface. |
| `accent-strong` | The hover and pressed fill of an `accent` button |
| `accent-foreground` | Label and icon on `accent` / `accent-strong` |
| `accent-soft` | Tinted background: selected chip, badge, highlighted row |
| `accent-on-soft` | Text and icons on `accent-soft` |
| `focus-ring` | Owned by the global focus rule. Components never use it directly. |

The `day` accent is `#005778`, not the source brand blue `#009fda`, which is 3.0:1 on white and is not a token. Use it only in a brand mark, as a content colour (`/* content color */`). The same rule holds for the extended themes' original primaries (`#6d5bef`, `#9366f0`, `#339966`): brand marks only.

### Status

`success`, `warning`, `danger` and `info` each come with `-foreground` (text on the solid fill), `-soft` (tinted background) and `-on-soft` (text on the tint). The base colour is also valid as text on any surface.

- Status never travels by colour alone: an icon or a word goes with it (1.4.1).
- `danger` is for destructive actions and errors only, never for emphasis.
- `danger-strong` is the hover and pressed fill of a danger button, with `danger-foreground` on it. Only danger has a `-strong` step, because it is the only status that is a button variant.
- `info` equals `accent` in the core themes. In the extended themes it carries the source palette's second accent (sky in dawn/midnight, violet in ocean), which is why it is a separate token.

### Charts

`chart-1` … `chart-5`, a categorical palette in fixed order. Core: blue, orange, violet, green, magenta. Extended themes: the theme's own hue first, then a fixed order (`src/tokens/sets/extended.ts`).

- Assign in order and never cycle: a 6th series goes into "Other" or small multiples.
- Each mark passes 3:1 on all surfaces in every theme. Pairwise separation is ≥7.7 ΔE (core) and ≥48 ΔE (extended), but ≥2 series always need a legend plus direct labels or gaps; colour is never the only key.
- Text in a chart uses the text tokens, never the series colour.

### Other

`overlay-scrim` is the modal backdrop. It carries its own alpha, so don't add an opacity modifier.

### Extension layer

App-only colours (pipeline states, an `onair` indicator) live in the app's own file, namespaced (`--app-*`), authored for every theme the app offers, and added to that app's contrast check. lumux never learns them.

## Type

| Role | Default (size / line / weight) | `dense` |
|---|---|---|
| `text-display` | 30 / 36 / 700 | same |
| `text-title` | 24 / 32 / 700 | 20 / 28 |
| `text-heading` | 20 / 28 / 600 | 16 / 24 |
| `text-subheading` | 16 / 24 / 600 | 14 / 20 |
| `text-body` | 16 / 24 / 400 | 14 / 20 |
| `text-body-sm` | 14 / 20 / 400 | 13 / 18 |
| `text-caption` | 13 / 18 / 400 | 12 / 16 |
| `text-label` | 12 / 16 / 500 | 11 / 14 |
| `text-data` | 13 / 18 / 400 | 11.5 / 14 |
| `text-micro` | resolves to `label` | 10 / 12 / 500, the hard floor |

- Each role carries its own line height and weight. A `leading-*` or `font-*` utility on the same element overrides it, so don't add one.
- `text-data` is paired with `font-mono tabular-nums`. Use it for anything that ticks or measures.
- Inputs are never below 16px on a coarse pointer: the base rule in `tokens.css` enforces it.
- Fonts:
  - `font-sans` is Inter Variable and `font-mono` is Geist Mono, both self-hosted by the app (`@fontsource-variable/inter`, `geist`). lumux ships the names, not the files.
  - Preload the Latin Inter woff2.
  - An embed snippet uses the system stack and never ships a webfont.
- Size never buys a contrast discount: every role uses the 7:1 text pairs.

## Density

`data-density="dense"` goes on a container (e.g. a dense console frame), never on `<html>`, and is not user-selectable. It changes type and padding. It never changes colour, radius or target size: controls stay 44px inside it.

## Spacing and sizing

- Spacing is Tailwind's 4px base. Allowed steps: `1 2 3 4 5 6 8 12 16` (4 8 12 16 20 24 32 48 64px). In `dense`, component padding steps down one. One exception: `0.5` (2px) for the padding and gap of a segmented track, paired with `rounded-inset`.
- Fixed sizes:

| Token | Value | Utility |
|---|---|---|
| `target-min` | 44px, every pointer | `h-target`, `min-h-target`, `size-target`, `min-w-target` |
| `header-height` | 56px | `h-header`, `min-h-header` (use `min-` when the bar carries a safe-area inset) |
| `sidebar-width` / `sidebar-rail` | 240 / 56px | `w-sidebar`, `w-rail` |
| `sheet-width` | 36rem | `max-w-sheet` |
| `dialog-sm` / `dialog-md` / `dialog-lg` | 25 / 35 / 50rem (400 / 560 / 800px) | `max-w-dialog-md` |
| `menu-min-width` | 12rem | `min-w-menu` |
| `card-padding` | 16px, **12px in `dense`** | `p-card` |

- Every interactive element is at least 44×44, or sits inside a 44×44 target. Inline text links are exempt (2.5.5). Adjacent targets keep an 8px gap or a visible boundary.
- Safe areas: `safe-top`, `safe-right`, `safe-bottom` and `safe-left` utilities add `env(safe-area-inset-*)` padding. Every fixed or sticky element uses them. Apps set `viewport-fit=cover` and never `maximum-scale` or `user-scalable=no`.
- Every value is in rem, so the scale follows the user's font size and holds at 200% zoom. 320px reflow is a component property, verified in Phase 2.

## Radius, borders, elevation, layers

| Token | Value | Use |
|---|---|---|
| `rounded-control` | 4px | Buttons, inputs, badges, chips, filter tags. Square, barely rounded. |
| `rounded-inset` | 2px | A control inside a 2px-padded track (segmented control, ThemeSwitcher): 4px outer minus 2px padding |
| `rounded-card` / `rounded-panel` | 8px | Cards; sheets and dialogs |
| `rounded-pill` | 9999px | Switch tracks, progress bars, avatars. Nothing else. |
| `--lumux-border-width` / `-emphasis` | 1px / 2px | 2px for emphasis only. A left-rail accent is a prop, never a second `border-*` class. |
| `shadow-flat` | none | The default. A bordered surface needs no shadow. |
| `shadow-raised` | 1px soft | A card lifted off the canvas |
| `shadow-overlay` | floating | Menus, popovers, dialogs |
| `z-base` … `z-tooltip` | 0, 10, 30, 40, 50, 60, 70, 80 | base, sticky, sidebar, overlay, modal, modal-top, toast, tooltip. Never a raw `z-[n]`. |

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 120ms | Colour, opacity |
| `duration-base` | 180ms | Small movement: popover, toast |
| `duration-panel` | 240ms | Sheets, sidebars |
| `ease-lumux` | `cubic-bezier(.2,.8,.2,1)` | Every transition |

- Under `prefers-reduced-motion: reduce`, and under `[data-reduce-motion="true"]` (the test hook), every duration becomes 0.01ms. A raw `duration-200` or a hard-coded `animation: … 0.3s` skips that, so it is a defect.
- Never `transition: all`.
- State is never conveyed by animation alone.

## Focus

One rule in `tokens.css`: `:focus-visible { outline: 2px solid var(--lumux-focus-ring); outline-offset: 2px }`, plus `outline-color: Highlight` under forced colors.

- It is an outline, not a box-shadow ring, so it survives Windows High Contrast.
- Components never restyle it.
- `outline-none` without a `focus-visible` replacement fails the gate.
- Sticky headers and toasts reserve space so a focused element is never hidden under them (2.4.11).

## Anti-patterns

| Don't | Do |
|---|---|
| `text-border`, `text-border-strong` | A text token |
| `border` on an input | `border-border-strong` |
| `bg-accent/10` behind text | `bg-accent-soft text-accent-on-soft` |
| `text-red-600`, `#c93312`, any raw palette class or hex | A status token |
| `text-foreground-subtle` for an error or instruction | `foreground` or the status token |
| A status colour with no icon or word | Icon or word plus colour |
| `h-8` on a button "for density" | `h-target`, and get density from `data-density="dense"` padding and type |
| `duration-300`, `transition-all` | `duration-fast` / `duration-base` / `duration-panel` |
| `z-[999]` | A `z-*` layer |
| `#009fda` as text or focus | `accent` / `focus-ring` |
| A `leading-*` next to a `text-*` role | Nothing: the role carries its line height |
| `rounded-pill` / `rounded-full` on a badge, chip or tag | `rounded-control` |
| `rounded-md`, `rounded-xl` or any Tailwind default radius | A lumux radius role |
