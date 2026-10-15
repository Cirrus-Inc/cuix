#!/usr/bin/env bash
# Installs cuix's three gates into a consumer repo.
#
#   bash node_modules/@cirrus/cuix/scripts/install-gates.sh [--src <dir>]... [--ui <dir>]
#
# From the consumer's root, this script:
#   1. copies check-ui-className.mjs, check-disabled-title.sh and
#      check-nested-scrollers.sh into scripts/ (overwriting: they are vendored
#      from the installed cuix tag, never edited in place)
#   2. writes cuix-gates.json if there is none (kept otherwise: it holds the
#      consumer's own roots and exceptions)
#   3. freezes cuix-gates.baseline.json if there is none, so the ratchets
#      measure against today and never let a count rise
#   4. adds check:gates (and the three check:* it runs) to package.json
#   5. runs the gates once and reports
#
# Idempotent: re-running after a cuix upgrade refreshes the three scripts and
# touches nothing else.
set -euo pipefail

die() { echo "install-gates: $*" >&2; exit 1; }

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f package.json ]] || die "run from the consumer's root (no package.json here)"
command -v node >/dev/null || die "node is required"

SRC=()
UI=""
FLAGS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --src) [[ $# -ge 2 && $2 != --* ]] || die "--src needs a value"; SRC+=("$2"); FLAGS=1; shift 2 ;;
    --ui) [[ $# -ge 2 && $2 != --* ]] || die "--ui needs a value"; UI="$2"; FLAGS=1; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done
[[ ${#SRC[@]} -gt 0 ]] || SRC=(src)

# Before the rename the config was lumux-gates.json; writing a fresh default
# beside it would silently drop the consumer's roots, exceptions and baseline.
if [[ -f lumux-gates.json && ! -f cuix-gates.json ]]; then
  die "found lumux-gates.json: rename it to cuix-gates.json (and lumux-gates.baseline.json to cuix-gates.baseline.json, with its \"baseline\" key), then re-run"
fi

mkdir -p scripts
for gate in check-ui-className.mjs check-disabled-title.sh check-nested-scrollers.sh; do
  cp "$here/$gate" "scripts/$gate"
  chmod +x "scripts/$gate"
done
cuix_version="$(node -p "require('$here/../package.json').version")"
echo "install-gates: copied three gates from cuix $cuix_version into scripts/"

if [[ ! -f cuix-gates.json ]]; then
  node - "$UI" "${SRC[@]}" <<'NODE'
const [ui, ...src] = process.argv.slice(2);
const config = {
  src,
  ...(ui ? { ui } : {}),
  shared: [],
  owns: {},
  allow: [],
  touchAllow: [],
  disabledTitleAllow: [],
  baseline: 'cuix-gates.baseline.json',
};
require('fs').writeFileSync('cuix-gates.json', `${JSON.stringify(config, null, 2)}\n`);
NODE
  echo "install-gates: wrote cuix-gates.json (src: ${SRC[*]}${UI:+, ui: $UI})"
else
  echo "install-gates: cuix-gates.json kept${FLAGS:+; --src/--ui ignored, edit the file}"
fi

# The config may name its own baseline path; checking the default name would
# re-freeze (and so raise) a custom baseline on every re-run.
baseline="$(node -p "JSON.parse(require('fs').readFileSync('cuix-gates.json','utf8')).baseline ?? 'cuix-gates.baseline.json'")" ||
  die "could not read cuix-gates.json"
if [[ ! -f "$baseline" ]]; then
  if ! freeze_out="$(node scripts/check-ui-className.mjs --update-baseline 2>&1)"; then
    echo "$freeze_out" >&2
  fi
  [[ -f "$baseline" ]] || die "could not write the baseline"
  echo "install-gates: froze $baseline"
else
  echo "install-gates: $baseline kept"
fi

node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts ??= {};
const want = {
  'check:ui': 'node scripts/check-ui-className.mjs',
  'check:disabled-title': 'bash scripts/check-disabled-title.sh',
  'check:nested-scrollers': 'bash scripts/check-nested-scrollers.sh',
  'check:gates': 'npm run check:ui && npm run check:disabled-title && npm run check:nested-scrollers',
};
let added = 0;
for (const [k, v] of Object.entries(want)) {
  if (pkg.scripts[k] === undefined) {
    pkg.scripts[k] = v;
    added++;
  }
}
fs.writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`install-gates: ${added ? `added ${added} npm script(s)` : 'npm scripts already present'}; run \`npm run check:gates\``);
NODE

echo
npm run -s check:gates
