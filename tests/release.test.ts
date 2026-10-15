import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// release.sh folds CHANGELOG.md through fold-changelog.sh; the fold is tested on a throwaway copy.
const script = new URL('../scripts/fold-changelog.sh', import.meta.url).pathname;

const LOG = `# Changelog

## [Unreleased]

- feat(react): one
- fix(react): two

## [0.4.0] - 2026-10-14

- old

[Unreleased]: https://github.com/Cirrus-Inc/cuix/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.4.0
`;

function fold(body: string, v = '0.5.0') {
  const file = join(mkdtempSync(join(tmpdir(), 'cuix-fold-')), 'CHANGELOG.md');
  writeFileSync(file, body);
  const r = spawnSync('bash', [script, v, '2026-10-15', file], { encoding: 'utf8' });
  return { code: r.status, err: r.stderr, out: readFileSync(file, 'utf8') };
}

test('fold: dates the section, opens an empty Unreleased, fixes the links', () => {
  const r = fold(LOG);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, `# Changelog

## [Unreleased]

## [0.5.0] - 2026-10-15

- feat(react): one
- fix(react): two

## [0.4.0] - 2026-10-14

- old

[Unreleased]: https://github.com/Cirrus-Inc/cuix/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.5.0
[0.4.0]: https://github.com/Cirrus-Inc/cuix/releases/tag/v0.4.0
`);
});

test('fold: an Unreleased without bullets fails and leaves the file alone', () => {
  const empty = LOG.replace(/- feat\(react\): one\n- fix\(react\): two\n\n/, '');
  const r = fold(empty);
  assert.equal(r.code, 1);
  assert.match(r.err, /no bullets/);
  assert.equal(r.out, empty);
});

test('fold: a section that already exists, or a bad version, fails', () => {
  assert.equal(fold(LOG, '0.4.0').code, 1);
  assert.equal(fold(LOG, 'v0.5').code, 1);
});

test('fold: a missing Unreleased compare link fails and leaves the file alone', () => {
  const nolink = LOG.replace(/^\[Unreleased\]: .*\n/m, '');
  const r = fold(nolink);
  assert.equal(r.code, 1);
  assert.match(r.err, /compare/);
  assert.equal(r.out, nolink);
});
