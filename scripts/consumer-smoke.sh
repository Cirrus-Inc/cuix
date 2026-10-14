#!/usr/bin/env bash
# Installs the packed tarball into tests/consumer, as a consumer would, and checks
# what the repo's own tests cannot see: the `exports` map, the `files` list, the
# emitted .js/.d.ts, Tailwind finding component classes in node_modules, and SSR.
#
#   npm run smoke:consumer
#
# The app is copied out of the repo first, so nothing resolves from the root node_modules.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
step() { echo "consumer-smoke: $*"; }
die() { echo "consumer-smoke: FAIL: $*" >&2; exit 1; }

cd "$root"
# The build writes into dist/ without cleaning it; a stale file would mask a missing one.
step "build"
rm -rf dist
npm run -s build

step "pack"
tgz="$work/$(npm pack -s --pack-destination "$work")"

step "exports targets are in the tarball"
listing="$(tar -tzf "$tgz")"
targets="$(node -e '
  const walk = (v) => typeof v === "string" ? [v] : Object.values(v).flatMap(walk);
  console.log(walk(require("./package.json").exports).join("\n"));')"
while read -r t; do
  grep -qxF "package/${t#./}" <<<"$listing" || die "exports target $t is not in the tarball"
done <<<"$targets"

cp -R tests/consumer "$work/app"
cd "$work/app"
step "install tarball + peers"
npm ci -s --no-audit --no-fund
npm i -s --no-save --no-audit --no-fund "$tgz"

step "tsc --noEmit (moduleResolution bundler)"
npx tsc --noEmit

step "vite build"
npx vite build --logLevel warn
# Classes only dist/react uses; the app's own source has none of them.
for sel in '.bg-overlay-scrim' '.sm\:max-w-dialog-md' '.min-h-target'; do
  grep -qF "$sel" dist/assets/*.css || die "built CSS lacks $sel (theme.css @source missed dist/react?)"
done

step "SSR renderToString"
node src/ssr.ts
step "ok"
