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
  if [[ $t == *"*"* ]]; then
    # A pattern target (./map/geo/*): at least one file must match it.
    re="^package/$(sed 's/[.]/[.]/g; s/[*]/[^\/]+/' <<<"${t#./}")\$"
    grep -qE "$re" <<<"$listing" || die "exports pattern $t matches nothing in the tarball"
  else
    grep -qxF "package/${t#./}" <<<"$listing" || die "exports target $t is not in the tarball"
  fi
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

# The county files are lazy: one chunk per state, none in the entry chunk.
ls dist/assets | grep -q '^US-FL-.*[.]js$' || die "no lazy US-FL chunk in the build (county files bundled eagerly?)"

step "SSR renderToString"
node src/ssr.ts

step "map-only install: no Radix, no lucide, no maplibre-gl"
mkdir "$work/maponly"
cd "$work/maponly"
echo '{ "name": "cuix-map-only", "private": true, "type": "module" }' >package.json
npm i -s --no-audit --no-fund react@19.3.1 react-dom@19.3.1 "$tgz"
for p in @radix-ui lucide-react maplibre-gl eslint-plugin-jsx-a11y; do
  [[ ! -e node_modules/$p ]] || die "a map-only install pulled in $p"
done
cat >smoke.mjs <<'JS'
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { UsMap, LayersPanel } from '@cirrus/cuix/map';
import { StreetMap } from '@cirrus/cuix/map/street';
import { COUNTIES } from '@cirrus/cuix/map/geo/US-TX';
const html = renderToString(h('div', null,
  h(UsMap, { level: { kind: 'us' }, label: 'States', states: [], onSelect() {} }),
  h(LayersPanel, { layers: [{ id: 'a', label: 'A' }], value: {}, onChange() {} }),
  h(StreetMap, { label: 'District' })));
if (!html.includes('aria-label="District"') || COUNTIES.length < 200) throw new Error('map-only render failed');
console.log(`consumer-smoke: map-only SSR ${html.length} bytes, ${COUNTIES.length} TX counties`);
JS
node smoke.mjs
step "ok"
