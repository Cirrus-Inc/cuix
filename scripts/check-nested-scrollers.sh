#!/usr/bin/env bash
# cuix gate: every overflow utility is a decision somebody wrote down.
# Parameterized by `cuix-gates.json` in the current directory (or `$CUIX_GATES`).
#
# The defect: a container inside a fixed-height shell gets its own
# `overflow-y-auto`, and whatever does not fit is in the DOM, unreachable, with
# no scrollbar to hint that anything is below. Three control groups once read
# as "deleted" to an operator; an audit of i18n keys said nothing was missing,
# because nothing WAS missing. Presence audits cannot see this; only layout can.
#
# So: any overflow utility on a scanned surface needs `scroll-ok: <why>` on the
# same line or within the three lines above it. Legitimate uses exist (a
# horizontal strip whose partial last card IS the affordance; a frame clipping
# a video; the one body scroller of a dialog). The gate stops the accidental
# one.
#
# Blind spot: it reads class strings, so `style={{ overflow: "hidden" }}` walks
# past it. The e2e harness measures layout, which is what catches that.
#
# Config key: `scrollRoots` (falls back to `src` + `ui`).
set -euo pipefail

CONFIG="${CUIX_GATES:-cuix-gates.json}"
ROOTS=()
if [[ -f "$CONFIG" ]]; then
  # Command substitution, not process substitution: a malformed config fails
  # here instead of leaving ROOTS empty and the gate passing on nothing.
  roots="$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log((c.scrollRoots??[...(c.src??["src"]),...(c.ui?[c.ui]:[])]).join("\n"))' "$CONFIG")" ||
    { echo "FAIL: could not read $CONFIG" >&2; exit 1; }
  while IFS= read -r line; do [[ -n "$line" ]] && ROOTS+=("$line"); done <<<"$roots"
else
  ROOTS=(src)
fi
[[ ${#ROOTS[@]} -gt 0 ]] || { echo "FAIL: $CONFIG names no roots to scan" >&2; exit 1; }

# Utilities that can clip or scroll content away, with any variant prefix.
PATTERN='(^|[^a-z-])([a-z0-9-]+:)*overflow(-x|-y)?-(auto|scroll|hidden|clip)'

violations=""
for root in "${ROOTS[@]}"; do
  [[ -d "$root" ]] || continue
  while IFS= read -r -d '' file; do
    case "$file" in
      *.test.tsx | *.test.ts | *.spec.tsx | *.spec.ts) continue ;;
      */tests/* | */test/* | */e2e/* | */__tests__/*) continue ;;
    esac
    while IFS= read -r hit; do
      line="${hit%%:*}"
      prev=$((line > 3 ? line - 3 : 1))
      if sed -n "${prev},${line}p" "$file" | grep -q "scroll-ok:"; then
        continue
      fi
      violations+="$file:$hit"$'\n'
    done < <(grep -EIn "$PATTERN" "$file" 2>/dev/null || true)
  done < <(find "$root" -type d -name node_modules -prune -o -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' \) -print0)
done

if [[ -n "$violations" ]]; then
  echo "FAIL: an overflow utility with no stated reason."
  echo
  echo "A container that scrolls or clips can hide controls with no affordance."
  echo "If this one is deliberate, say why on the line or within three lines"
  echo "above it:  // scroll-ok: horizontal strip, partial card is the hint"
  echo
  echo "$violations"
  exit 1
fi

echo "OK: every overflow utility is justified."
