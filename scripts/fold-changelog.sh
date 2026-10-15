#!/usr/bin/env bash
# Folds CHANGELOG.md's [Unreleased] section into a dated [X.Y.Z] section.
#
#   scripts/fold-changelog.sh X.Y.Z YYYY-MM-DD [CHANGELOG.md]
#
# Renames "## [Unreleased]" to "## [X.Y.Z] - <date>", inserts a fresh empty
# "## [Unreleased]" above it, adds the "[X.Y.Z]: .../releases/tag/vX.Y.Z" link line
# and moves the "[Unreleased]: .../compare/vX.Y.Z...HEAD" link to the new tag.
# Fails when [Unreleased] has no bullets. Called by release.sh.
set -euo pipefail

die() { echo "fold-changelog: $*" >&2; exit 1; }

v="${1:-}"; date="${2:-}"; file="${3:-CHANGELOG.md}"
[[ $v =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && $date =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "usage: fold-changelog.sh X.Y.Z YYYY-MM-DD [file]"
[[ -f $file ]] || die "$file not found"
[[ $(grep -c '^## \[Unreleased\]$' "$file") == 1 ]] || die "$file needs exactly one '## [Unreleased]' heading"
grep -q '^\[Unreleased\]: .*/compare/v[0-9]*\.[0-9]*\.[0-9]*\.\.\.HEAD$' "$file" || die "$file has no '[Unreleased]: .../compare/vX.Y.Z...HEAD' link"
! grep -q "^## \[$v\]" "$file" || die "$file already has a [$v] section"

awk '/^## \[Unreleased\]$/ {u=1; next} u && /^## / {exit} u && /^- / {n++} END {exit !n}' "$file" \
  || die "[Unreleased] has no bullets; nothing to release"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
awk -v v="$v" -v d="$date" '
  /^## \[Unreleased\]$/ { print; print ""; print "## [" v "] - " d; next }
  /^\[Unreleased\]: / { sub(/compare\/v[^.]+\.[^.]+\.[^.]+\.\.\./, "compare/v" v "..."); print
    print "[" v "]: https://github.com/Cirrus-Inc/cuix/releases/tag/v" v; next }
  { print }
' "$file" > "$tmp"
cat "$tmp" > "$file"
