# Contributing to lumux

## Ground rules

- The decisions in [`ARCHITECTURE.md`](./ARCHITECTURE.md) (D1-D23) are settled. Reopen one with a written case in an issue, not a PR.
- A new token or component needs a real use in at least two consumer apps. One-off needs stay in the app's own extension layer.
- A red gate is never bypassed. Fix the cause.

## Setup

Node >= 22.18 (see `engines` in `package.json`).

```sh
npm ci
npx playwright install chromium webkit   # first time, for the e2e harness
```

## Gates

Run both before opening a PR; CI runs the same.

```sh
npm run check   # typecheck, lint, contrast, the three gates, build, unit tests
npm run e2e     # axe, 44px targets, focus, 320px / 200% zoom, in every theme; overlays also on WebKit
```

`npm run playground` serves the page the e2e harness drives. When another checkout already holds port 5179, run `E2E_PORT=5189 npm run e2e`: locally the harness reuses a running server, so it would test the other checkout.

## Pull requests

- Keep them small and focused; say what changed and how you verified it.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(react): ...`, `fix(tokens): ...`, `docs: ...`).
- If you change a token, a component contract or a gate, update the matching file in `docs/` in the same PR.
- A minor release also needs a manual screen-reader pass (VoiceOver and NVDA) over the playground; maintainers do this.

## Installing and releases

Consumers pin an exact tag, never a branch:

```sh
npm i github:danieloceno/lumux#v0.3.0
```

Releases are cut by maintainers from a clean, up-to-date `main`:

```sh
npm run release -- X.Y.Z
```

The script bumps the version and the install snippets, runs the full gate, commits `dist/` on the tagged commit, untracks `dist/` again on the release branch, pushes the tag, opens the release PR and publishes the GitHub release. It uses the maintainers' internal `git smart` commit tool, so it is not runnable by outside contributors. Maintainers also add the new tag's entry to [`CHANGELOG.md`](./CHANGELOG.md).

## Security

Do not report vulnerabilities in issues. See [`SECURITY.md`](./SECURITY.md).

## License

By contributing you agree your contribution is licensed under the [MIT License](./LICENSE).
