# Changelog

Every tag, newest first. Entries before the lumux import reference PRs of the private `Cirrus-Inc/cuix` repository; `v0.1.0` and `v0.2.0` were tagged there only and are not installable from lumux. Install a tag with `npm i github:danieloceno/lumux#vX.Y.Z`. Breaking changes are token renames and removals and component API breaks; removed tokens ship as deprecated aliases for one minor first. GitHub Releases carry the same notes, generated from merged PR titles. Maintainers update this file when cutting a release.

## [Unreleased]

- Sync community files, `ARCHITECTURE.md` and the README License / Roadmap sections from `Cirrus-Inc/cuix`; `scripts/release.sh` can now cut a tag at the current `package.json` version.
- Add MIT `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` and this changelog; add package metadata (`license`, `repository`, `homepage`, `bugs`, `description`, `keywords`).
- Remove internal analysis prompts and private product inventories from the repository and from `ARCHITECTURE.md`; the install no longer mentions private-repo access.
- Add `CODEOWNERS`, a pull request template and bug / feature issue templates.
- chore(release): sync the install pin and release notes on release (Cirrus-Inc/cuix#18)

## [0.3.0] - 2026-10-08

Phase 2 complete: overlays, content and feedback components, own `ToastProvider` (no sonner), three installable gates via `scripts/install-gates.sh`.

- feat(gates): installable gates and component docs (Cirrus-Inc/cuix#16)
- feat(react): content and feedback: Card, Badge, EmptyState, ConfirmInline, Toast (Cirrus-Inc/cuix#15)
- chore(demo): publish the playground to GitHub Pages from main (Cirrus-Inc/cuix#14)
- feat(react): overlays: Dialog, Sheet, Drawer, Tooltip, Menu, Popover (Cirrus-Inc/cuix#13)

## 0.2.0 - 2026-10-08

Six named themes (core day/night + extended dawn/midnight/forest/ocean) at AAA, Phase 2a foundation and 2b forms, `/eslint` config, `tokens.host.css`.

- docs(tokens): sync README and docs with the six-theme system (Cirrus-Inc/cuix#10)
- feat(tokens): six themes: core pair + extended four at AAA (Cirrus-Inc/cuix#9)
- feat(react): forms (Cirrus-Inc/cuix#8)
- feat(tokens): square radius: control 4, inset 2, card 8, no pill chips (Cirrus-Inc/cuix#7)
- feat(react): React foundation, Button family, a11y harness (Cirrus-Inc/cuix#6)
- feat(tokens): add `tokens.host.css` for shadow-root consumers (Cirrus-Inc/cuix#5)

## 0.1.0 - 2026-10-04

Phase 1: core day/night tokens at AAA, generated `tokens.css` / `theme.css` / `tokens.embed.css`, contrast gate.

- feat(tokens): core tokens, generated CSS, AAA contrast gate (Cirrus-Inc/cuix#3)
- docs(tokens): adopt core day/night as the only palette at AAA (Cirrus-Inc/cuix#2)
- docs: README with Mermaid, badges and decision index (Cirrus-Inc/cuix#1)

[Unreleased]: https://github.com/danieloceno/lumux/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/danieloceno/lumux/releases/tag/v0.3.0
