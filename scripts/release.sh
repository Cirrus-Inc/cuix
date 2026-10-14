#!/usr/bin/env bash
# Cuts a lumux release (git-tag install, dist/ committed on the tag commit).
#
#   scripts/release.sh 0.1.0
#
# From a clean, up-to-date main, this script:
#   1. bumps the version, points the install snippets at the new tag, runs the
#      full gate and the consumer smoke (the packed tarball, installed) and builds
#      dist/, then folds CHANGELOG.md's [Unreleased] into a dated [X.Y.Z] section
#      (fails if [Unreleased] has no bullets)
#   2. commits package.json + docs + CHANGELOG.md + dist/ on a release/ branch and
#      tags that commit
#   3. untracks dist/ in a second commit, so merging the branch brings only the
#      version bump to main
#   4. pushes the branch and the tag, opens the PR, and publishes a GitHub
#      release whose notes are the PRs merged since the previous tag
#
# A minor (X.Y.0) also needs the manual screen-reader pass (VoiceOver + NVDA)
# over the playground. The script asks; it cannot check.
#
# Consumers install the tag: npm i github:danieloceno/lumux#v0.1.0
set -euo pipefail

die() { echo "release: $*" >&2; exit 1; }

v="${1:-}"
[[ $v =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "usage: scripts/release.sh X.Y.Z"
tag="v$v"

[[ $(git branch --show-current) == main ]] || die "run from main"
[[ -z $(git status --porcelain) ]] || die "working tree not clean"
git fetch -q origin main --tags
[[ $(git rev-parse HEAD) == $(git rev-parse origin/main) ]] || die "main is not origin/main"
! git rev-parse -q --verify "refs/tags/$tag" >/dev/null || die "$tag already exists"

prev="$(git describe --tags --abbrev=0 2>/dev/null || true)"

if [[ $v == *.0 ]]; then
  if [[ -t 0 ]]; then
    read -r -p "release: $tag is a minor. Screen-reader pass (VoiceOver + NVDA) done on the playground? [y/N] " ok || ok=
  else
    ok="${SR_PASS_DONE:-}"
  fi
  [[ $ok == [yY] ]] || die "do the pass first; non-interactive: SR_PASS_DONE=y"
fi

# The install snippets pin the tag; they went stale at v0.3.0 when nothing did this.
PINNED=(README.md docs/getting-started.md)
perl -pi -e "s#(github:danieloceno/lumux\#)v\\d+\\.\\d+\\.\\d+#\${1}$tag#g" "${PINNED[@]}"

# The build writes into dist/ without cleaning it; stale files would ship on the tag.
rm -rf dist
[[ $(node -p "require('./package.json').version") == "$v" ]] || npm version "$v" --no-git-tag-version >/dev/null
npm run check || { git checkout -- package.json package-lock.json "${PINNED[@]}"; die "gate failed; version bump reverted"; }
npm run smoke:consumer || { git checkout -- package.json package-lock.json "${PINNED[@]}"; die "consumer smoke failed; version bump reverted"; }

bash scripts/fold-changelog.sh "$v" "$(date -u +%F)" || { git checkout -- package.json package-lock.json CHANGELOG.md "${PINNED[@]}"; die "CHANGELOG.md not folded; version bump reverted"; }

git add package.json package-lock.json CHANGELOG.md "${PINNED[@]}"
git add -f dist
git smart release "$tag" release
git tag -a "$tag" -m "$tag"

git rm -r -q --cached dist
git smart chore "untrack dist after $tag" release

git push -q -u origin HEAD
git push -q origin "$tag"

git diff --quiet origin/main HEAD || gh pr create --base main --title "chore(release): $tag" --label enhancement \
  --body "Tag \`$tag\` is pushed and carries \`dist/\`. This PR brings the version bump to main; \`dist/\` is untracked again."

# Release PRs are excluded by branch, not title: tooling PRs also use chore(release).
notes="$(gh pr list --state merged --base main --limit 1000 --search "merged:>$(git log -1 --format=%cI "${prev:-$(git rev-list --max-parents=0 HEAD)}")" \
  --json number,title,headRefName -q '.[] | select(.headRefName | startswith("release/") | not) | "- \(.title) (#\(.number))"')"
gh release create "$tag" --title "$tag" --verify-tag --notes "$(printf 'Install: `npm i github:danieloceno/lumux#%s`\n\n%s' "$tag" "${notes:-No merged PRs since ${prev:-the start}.}")"
echo "released $tag ($(git rev-parse --short "$tag"))"
