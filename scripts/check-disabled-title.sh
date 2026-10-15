#!/usr/bin/env bash
# cuix gate: a disabled control never carries its reason in a `title` alone.
# Parameterized by `cuix-gates.json` in the current directory (or `$CUIX_GATES`).
#
# The defect: a native `disabled` control whose only carrier of a refusal
# reason is `title` is unreachable by keyboard and screen reader. A `title` is
# a pointer affordance, and a `disabled` element is not in the tab order.
# Whether a title "carries a reason" is not decidable by a script, so the gate
# requires the wiring that makes a reason reachable: the same element must
# also carry `aria-describedby`. Review judges whether the described element
# is any good.
#
# Element-scoped: a JSX tag spans several lines, so each attribute is parsed
# (a brace-balanced `{…}`, a quoted string, a bare name, a spread, a comment
# between attributes) rather than scanning to the first `>`. `aria-disabled`
# and `data-title` never masquerade as the real attributes.
#
# Blind spot: the contents of a `{...spread}` are not visible here.
#
# Config keys: `src` (and `ui`) are the trees scanned; `disabledTitleAllow` is
# a list of "file:line|why" entries, keyed on the line the element's `<` starts
# on. A diff that moves an allowlisted element updates its key in the same
# commit.
set -euo pipefail

CONFIG="${CUIX_GATES:-cuix-gates.json}"
ROOTS=()
ALLOWED=()
if [[ -f "$CONFIG" ]]; then
  # Command substitution, not process substitution: a malformed config fails
  # here instead of leaving ROOTS empty and the gate passing on nothing.
  roots="$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log([...(c.src??["src"]),...(c.ui?[c.ui]:[])].join("\n"))' "$CONFIG")" ||
    { echo "FAIL: could not read $CONFIG" >&2; exit 1; }
  allowed="$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log((c.disabledTitleAllow??[]).join("\n"))' "$CONFIG")" ||
    { echo "FAIL: could not read $CONFIG" >&2; exit 1; }
  while IFS= read -r line; do [[ -n "$line" ]] && ROOTS+=("$line"); done <<<"$roots"
  while IFS= read -r line; do [[ -n "$line" ]] && ALLOWED+=("$line"); done <<<"$allowed"
else
  ROOTS=(src)
fi
[[ ${#ROOTS[@]} -gt 0 ]] || { echo "FAIL: $CONFIG names no roots to scan" >&2; exit 1; }

is_allowed() {
  local key="$1"
  for entry in "${ALLOWED[@]+"${ALLOWED[@]}"}"; do
    [[ "${entry%%|*}" == "$key" ]] && return 0
  done
  return 1
}

# `read -d ''` rather than a heredoc inside `$(…)`: bash 3.2 (macOS) mis-parses
# a heredoc holding a double quote inside a command substitution.
IFS= read -r -d '' PERL_SCRIPT <<'PERL' || true
my $file = shift @ARGV;
local $/;
open(my $fh, "<", $file) or die $!;
my $content = <$fh>;
close $fh;

my $BRACES = qr{ ( \{ (?: [^{}]++ | (?1) )*+ \} ) }xs;
my $TAG = qr{
  < [A-Za-z][\w.]*
  (?:
      \s++
    | // [^\n]*+ \n
    | /\* .*? \*/
    | $BRACES
    | [\w:.\-]++ (?: \s*+ = \s*+ (?: " [^"]* " | ' [^']* ' | $BRACES ) )?+
  ) *+
  /?+ >
}xs;

while ($content =~ /$TAG/g) {
  my $tag = $&;
  my $start = $-[0];
  my $has_disabled = ($tag =~ /(?<![\w-])disabled(?=[\s=\/>])/) ? 1 : 0;
  my $has_title = ($tag =~ /(?<![\w-])title(?=\s*=)/) ? 1 : 0;
  my $has_described = ($tag =~ /aria-describedby/) ? 1 : 0;
  if ($has_disabled && $has_title && !$has_described) {
    my $prefix = substr($content, 0, $start);
    my $newlines = ($prefix =~ tr/\n//);
    print "$file:", $newlines + 1, "\n";
  }
}
PERL

violations=""
for root in "${ROOTS[@]}"; do
  [[ -d "$root" ]] || continue
  while IFS= read -r -d '' file; do
    case "$file" in
      *.test.tsx | *.test.jsx | *.spec.tsx | *.spec.jsx) continue ;;
      */tests/* | */test/* | */e2e/* | */__tests__/*) continue ;;
    esac
    while IFS= read -r hit; do
      [[ -z "$hit" ]] && continue
      if ! is_allowed "$hit"; then
        violations+="$hit"$'\n'
      fi
    done < <(perl -e "$PERL_SCRIPT" "$file" 2>/dev/null)
  done < <(find "$root" -type d -name node_modules -prune -o -type f \( -name '*.tsx' -o -name '*.jsx' \) -print0)
done

if [[ -n "$violations" ]]; then
  echo "FAIL: a disabled control carries a title with no aria-describedby."
  echo "A title is a pointer affordance and a disabled control is not in the"
  echo "tab order: neither reaches a keyboard or screen-reader user. Wire the"
  echo "reason to a visible element via aria-describedby (cuix's Button does"
  echo "this with disabledReason), or add \"file:line|why\" to"
  echo "disabledTitleAllow in $CONFIG if the title is not a withheld reason."
  echo
  echo "$violations"
  exit 1
fi

echo "OK: every disabled+title control carries aria-describedby (or is exempted)."
