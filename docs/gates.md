# lumux gates

Three scripts that fail a build on the UI defects review does not catch. Written after
real production regressions, tied to lumux tokens and parameterized, so every consumer runs the
same gates against the same rules.
lumux runs them on itself (`npm run check:gates`, part of `npm run check`).

| Script | Catches | Mode |
|---|---|---|
| `check-ui-className.mjs` | An appearance utility (`bg-*`, `text-danger`, `rounded-*`, `p-*`…) in the `className` of a lumux primitive | blocking |
| | Raw palette classes, arbitrary values (`z-[60]`), motion literals (`duration-200`), `outline-none` with no `focus-visible`, raw `<button>` / `<input>` outside the primitives, on-screen prose over 90 characters | ratchet: per file, never up |
| | A height step under 44px (`h-9`, `size-8`, `h-[36px]`) in the app's own primitives directory | blocking |
| | A lucide glyph off the 14 / 16 / 20 / 32 scale, or with its own `strokeWidth` | blocking |
| | Opacity on a text colour (`text-foreground-muted/70`) | blocking |
| `check-disabled-title.sh` | A `disabled` control whose `title` is its only reason, with no `aria-describedby` | blocking |
| `check-nested-scrollers.sh` | An `overflow-*` utility with no `scroll-ok: <why>` comment | blocking |

## Install

From the consumer's root, once. In a monorepo, first check that `ls node_modules/lumux` resolves
there: `npm i -w <workspace> github:...#tag` can nest lumux under the workspace instead of hoisting
it (npm 11.18.0), which breaks this path and `--src`. Install from the repo root.

```sh
bash node_modules/lumux/scripts/install-gates.sh --src src --ui src/ui
npm run check:gates
```

- `--src` (repeatable) names the trees scanned for call sites and drift. Default `src`.
- `--ui` names the app's own primitives directory, if it has one: scanned for undersized
  controls, exempt from the raw-control ratchet. Omit it when every primitive comes from lumux.

What it does: copies the three scripts into `scripts/`, writes `lumux-gates.json`, freezes
`lumux-gates.baseline.json` from today's counts, adds `check:ui`, `check:disabled-title`,
`check:nested-scrollers` and `check:gates` to `package.json`, then runs them. Commit all of it
and add `npm run check:gates` to CI.

Re-run after every lumux upgrade: the scripts are vendored from the installed tag and
refreshed; config and baseline are kept. Never edit a copied script. A rule that needs changing
changes in lumux, for every app.

## `lumux-gates.json`

```jsonc
{
  "src": ["src"],                 // trees scanned for call sites and drift
  "ui": "src/ui",                 // optional: the app's own primitives
  "shared": ["src/shared"],       // optional: .ts copy tables scanned for prose, one level deep
  "owns": { "Chip": ["bg", "fg", "radius"] },   // app primitives the className check should cover
  "allow": [                      // ratchet exceptions that survive the migration; all four keys required
    { "rule": "outline-none", "file": "src/Panel.tsx", "snippet": "outline-none",
      "why": "programmatic focus on a container, every control inside keeps the ring" }
  ],
  "touchAllow": [                 // a height under 44 that is not a control; excuses ONE occurrence
    { "file": "src/ui/Track.tsx", "snippet": "h-6", "why": "the switch track inside a 44px label row" }
  ],
  "disabledTitleAllow": ["src/Swatch.tsx:41|title duplicates aria-label, names the colour"],
  "scrollRoots": ["src/console"], // optional: narrows the scroller gate; default src + ui
  "baseline": "lumux-gates.baseline.json"
}
```

`owns` lists which properties a primitive sets for itself: `bg`, `fg`, `edge`, `type`,
`radius`, `shadow`, `height`, `pad`, `rhythm`. A className can only lose a race it is in, so
`mt-4` on a Card passes and `gap-4` on a Field fails.

## Ratchets

The baseline is per file. A file with no entry is measured against zero. The build fails when
a file's count rises and prints every hit in that file; it prints a loud `↓` when a count
fell, so you rerun `node scripts/check-ui-className.mjs --update-baseline` in the same PR and
the ratchet keeps ratcheting. Allowlist entries are for exceptions that survive the migration,
not for call sites you have not migrated yet.

## Escape hatches, each with a reason

- A legitimate scroller: `// scroll-ok: horizontal strip, partial card is the hint` on the
  line or within three lines above.
- A `title` that names rather than refuses: `disabledTitleAllow`, keyed on the line the
  element's `<` starts on. A diff that moves the element updates the key.
- A height under 44 that is not a target: `touchAllow`. An entry that stops matching fails the
  build; delete it.

## Blind spots, so nobody over-trusts a green run

These are text scans. A `{...spread}` hides its attributes; `style={{ overflow }}` is not a
class; a class reaching a primitive through `cn()` from a variable is not in the `className`
literal; a tag name in a comment counts as a tag. The Playwright harness (`npm run e2e`)
measures the rendered page and is what catches what the scans cannot.
