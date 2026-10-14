import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A gate nobody has ever seen fail is a gate nobody knows works. Each test
// plants one defect in a throwaway consumer and asserts the gate names it.
const root = new URL('..', import.meta.url).pathname;
const gate = (name: string) => join(root, 'scripts', name);

function consumer(files: Record<string, string>, config: Record<string, unknown> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'lumux-gates-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  writeFileSync(join(dir, 'lumux-gates.json'), JSON.stringify({ src: ['src'], ui: 'src/ui', ...config }));
  return dir;
}

const run = (cmd: string, args: string[], cwd: string) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const node = (cwd: string, ...args: string[]) => run('node', [gate('check-ui-className.mjs'), ...args], cwd);
const bash = (script: string, cwd: string) => run('bash', [gate(script)], cwd);

const CLEAN = `import { Button } from 'lumux/react';
export const A = () => <Button className="mt-4 w-full">Save</Button>;
`;

test('className gate: clean consumer passes once a baseline exists', () => {
  const dir = consumer({ 'src/a.tsx': CLEAN });
  assert.equal(node(dir).code, 1, 'no baseline yet');
  assert.equal(node(dir, '--update-baseline').code, 0);
  const r = node(dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /ui\/className: clean/);
});

test('className gate: appearance utility on a primitive fails, layout passes', () => {
  const dir = consumer({
    'src/a.tsx': `import { Button, Card } from 'lumux/react';
export const A = () => (
  <>
    <Button variant="primary" className="bg-success mt-2">Go</Button>
    <Card className="mt-4 md:col-span-2" title={<h2 className="text-heading">Own h2</h2>}>x</Card>
  </>
);
`,
  });
  node(dir, '--update-baseline');
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /src\/a\.tsx:4\s+<Button>\s+background colour "bg-success"/);
  assert.doesNotMatch(r.out, /<Card>/, 'a className inside a prop value is the child\'s, not Card\'s');
});

test('className gate: ratchets fail only when a count rises', () => {
  const dir = consumer({ 'src/a.tsx': `export const A = () => <p className="text-slate-500 z-[60]">x</p>;\n` });
  node(dir, '--update-baseline');
  const frozen = JSON.parse(readFileSync(join(dir, 'lumux-gates.baseline.json'), 'utf8'));
  assert.deepEqual(frozen.palette, { 'src/a.tsx': 1 });
  assert.deepEqual(frozen.arbitrary, { 'src/a.tsx': 1 });
  assert.equal(node(dir).code, 0, 'same counts pass');

  writeFileSync(join(dir, 'src/b.tsx'), `export const B = () => <p className="bg-rose-100 duration-200">x</p>;\n`);
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /raw palette: 2, baseline 1/);
  assert.match(r.out, /src\/b\.tsx\s+0 → 1\s+\(file not in baseline\)/);
  assert.match(r.out, /motion literal: 1, baseline 0/);
});

test('className gate: outline-none without focus-visible counts, with it does not', () => {
  const dir = consumer({
    'src/a.tsx': `export const A = () => (
  <>
    <button className="outline-none">bad</button>
    <button className={\`outline-none \${x ? 'a' : 'b'} focus-visible:outline-2\`}>good</button>
  </>
);
`,
  });
  node(dir, '--update-baseline');
  const frozen = JSON.parse(readFileSync(join(dir, 'lumux-gates.baseline.json'), 'utf8'));
  assert.deepEqual(frozen['outline-none'], { 'src/a.tsx': 1 });
  assert.deepEqual(frozen['raw-control'], { 'src/a.tsx': 2 });
});

test('touch-target: a height step under 44px in the primitives dir is blocking', () => {
  const dir = consumer({ 'src/ui/Chip.tsx': `const SIZES = { md: 'h-9 px-3', px: 'h-[36px]', ok: 'min-h-target h-96' };\n` });
  node(dir, '--update-baseline');
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /ui\/touch-target: 2 control\(s\) below 44px/);
  assert.match(r.out, /"h-9"/);
  assert.match(r.out, /"h-\[36px\]"/);
  assert.doesNotMatch(r.out, /h-96/);
});

test('touch-target: a touchAllow entry excuses one hit and must stay in use', () => {
  const files = { 'src/ui/Track.tsx': `const T = 'h-6 w-11';\n` };
  const allow = { touchAllow: [{ file: 'src/ui/Track.tsx', snippet: 'h-6', why: 'a track, not a control' }] };
  const dir = consumer(files, allow);
  node(dir, '--update-baseline');
  assert.match(node(dir).out, /touch-target: clean .*1 named exception/);

  const stale = consumer({ 'src/ui/Track.tsx': `const T = 'min-h-target';\n` }, allow);
  node(stale, '--update-baseline');
  const r = node(stale);
  assert.equal(r.code, 1);
  assert.match(r.out, /exception\(s\) no longer needed/);
});

test('icons: off-scale size or strokeWidth on a lucide glyph fails; size={20} passes', () => {
  const dir = consumer({
    'src/a.tsx': `import { X, Check as Tick } from 'lucide-react';
export const A = () => (
  <>
    <X className="size-6" />
    <Tick strokeWidth={1} />
    <X size={20} />
    <X className="size-5" />
  </>
);
`,
  });
  node(dir, '--update-baseline');
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /ui\/icons: 2 glyph\(s\) off the icon scale/);
  assert.match(r.out, /<X> size-6/);
  assert.match(r.out, /<Tick strokeWidth=…>/);
});

test('muted-alpha: opacity on a text colour fails', () => {
  const dir = consumer({ 'src/a.tsx': `export const A = () => <p className="text-foreground-muted/70">x</p>;\n` });
  node(dir, '--update-baseline');
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /ui\/muted-alpha: 1 text colour\(s\) with opacity/);
});

test('muted-alpha: only a lucide icon is exempt, not any capitalised tag', () => {
  const dir = consumer({
    'src/a.tsx': `import { X } from 'lucide-react';
export const A = () => (
  <>
    <X className="text-foreground/60" />
    <Link className="text-foreground/60">x</Link>
  </>
);
`,
  });
  node(dir, '--update-baseline');
  const r = node(dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /ui\/muted-alpha: 1 text colour\(s\) with opacity\s+src\/a\.tsx:5/);
});

test('raw-control: a ui path written as ./dir/ still exempts the primitives dir', () => {
  const dir = consumer({ 'src/ui/Chip.tsx': `export const C = () => <button className="min-h-target">x</button>;\n` }, { ui: './src/ui/' });
  node(dir, '--update-baseline');
  const frozen = JSON.parse(readFileSync(join(dir, 'lumux-gates.baseline.json'), 'utf8'));
  assert.deepEqual(frozen['raw-control'], {});
});

test('shell gates: a malformed config fails instead of scanning nothing', () => {
  const dir = consumer({ 'src/a.tsx': `<div className="overflow-hidden" />` });
  writeFileSync(join(dir, 'lumux-gates.json'), '{bad');
  for (const g of ['check-disabled-title.sh', 'check-nested-scrollers.sh']) {
    const r = bash(g, dir);
    assert.equal(r.code, 1, `${g}: ${r.out}`);
    assert.match(r.out, /could not read lumux-gates\.json/);
  }
});

test('disabled-title: disabled + title with no aria-describedby fails, wired passes, allowlist exempts', () => {
  const bad = `export const A = () => (
  <button
    type="button"
    disabled={!ok || count(id) > 0}
    title="Add a row first"
  >
    Save
  </button>
);
`;
  const dir = consumer({ 'src/a.tsx': bad });
  let r = bash('check-disabled-title.sh', dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /src\/a\.tsx:2/);

  const wired = bad.replace('title="Add a row first"', 'title="Add a row first" aria-describedby="why"');
  const ok = consumer({ 'src/a.tsx': wired, 'src/b.tsx': `export const B = () => <Example title="t"><button disabled>x</button></Example>;\n` });
  r = bash('check-disabled-title.sh', ok);
  assert.equal(r.code, 0, r.out);

  const exempt = consumer({ 'src/a.tsx': bad }, { disabledTitleAllow: ['src/a.tsx:2|title names the control, aria-label twin'] });
  assert.equal(bash('check-disabled-title.sh', exempt).code, 0);
});

test('nested-scrollers: overflow without scroll-ok fails, with it passes', () => {
  const dir = consumer({
    'src/a.tsx': `export const A = () => (
  <>
    <div className="overflow-y-auto">bad</div>
    <div className="lg:overflow-hidden">bad too</div>
    {/* scroll-ok: horizontal strip, partial card is the hint */}
    <div className="flex overflow-x-auto">good</div>
  </>
);
`,
  });
  const r = bash('check-nested-scrollers.sh', dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /src\/a\.tsx:3:/);
  assert.match(r.out, /src\/a\.tsx:4:/);
  assert.doesNotMatch(r.out, /src\/a\.tsx:6:/);

  const scoped = consumer({ 'src/a.tsx': `<div className="overflow-hidden" />`, 'other/b.tsx': `<div className="overflow-hidden" />` }, { scrollRoots: ['other'] });
  const s = bash('check-nested-scrollers.sh', scoped);
  assert.equal(s.code, 1);
  assert.doesNotMatch(s.out, /src\/a\.tsx/);
});

test('install-gates.sh: copies the gates, writes config, baseline and npm scripts, idempotently', () => {
  const dir = consumer({ 'src/a.tsx': CLEAN });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer', scripts: { test: 'x' } }));
  // The fresh consumer has no lumux-gates.json; drop the one `consumer()` wrote.
  writeFileSync(join(dir, 'lumux-gates.json'), '');
  spawnSync('rm', [join(dir, 'lumux-gates.json')]);

  let r = run('bash', [gate('install-gates.sh'), '--src', 'src', '--ui', 'src/ui'], dir);
  assert.equal(r.code, 0, r.out);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['check:gates'], 'npm run check:ui && npm run check:disabled-title && npm run check:nested-scrollers');
  assert.equal(pkg.scripts.test, 'x');
  const cfg = JSON.parse(readFileSync(join(dir, 'lumux-gates.json'), 'utf8'));
  assert.deepEqual(cfg.src, ['src']);
  assert.equal(cfg.ui, 'src/ui');
  for (const g of ['check-ui-className.mjs', 'check-disabled-title.sh', 'check-nested-scrollers.sh']) {
    assert.equal(readFileSync(join(dir, 'scripts', g), 'utf8'), readFileSync(gate(g), 'utf8'));
  }
  assert.match(r.out, /froze lumux-gates\.baseline\.json/);

  writeFileSync(join(dir, 'lumux-gates.json'), JSON.stringify({ ...cfg, src: ['app'] }));
  r = run('bash', [gate('install-gates.sh')], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /lumux-gates\.json kept/);
  assert.match(r.out, /baseline\.json kept/);
  assert.match(r.out, /npm scripts already present/);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'lumux-gates.json'), 'utf8')).src, ['app']);
});

test('install-gates.sh: a custom baseline path is kept on re-run, never re-frozen', () => {
  const dir = consumer({ 'src/a.tsx': `export const A = () => <p className="text-slate-500">x</p>;\n` }, { baseline: 'gates/base.json' });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer' }));
  mkdirSync(join(dir, 'gates'));
  const frozen = '{\n  "palette": {}\n}\n';
  writeFileSync(join(dir, 'gates/base.json'), frozen);
  const r = run('bash', [gate('install-gates.sh')], dir);
  assert.match(r.out, /gates\/base\.json kept/);
  assert.equal(readFileSync(join(dir, 'gates/base.json'), 'utf8'), frozen);
});

const fresh = (files: Record<string, string> = { 'src/a.tsx': CLEAN }) => {
  const dir = consumer(files);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer' }));
  spawnSync('rm', [join(dir, 'lumux-gates.json')]);
  return dir;
};

test('install-gates.sh: --src or --ui without a value is a usage error, not an unbound variable', () => {
  for (const flag of ['--src', '--ui']) {
    const r = run('bash', [gate('install-gates.sh'), flag], fresh());
    assert.equal(r.code, 1);
    assert.match(r.out, new RegExp(`install-gates: ${flag} needs a value`));
    assert.doesNotMatch(r.out, /unbound variable/);
  }
});

test('install-gates.sh: a baseline that cannot be written surfaces the gate\'s own error', () => {
  const dir = fresh();
  writeFileSync(join(dir, 'lumux-gates.json'), JSON.stringify({ src: ['src'], baseline: 'nodir/base.json' }));
  const r = run('bash', [gate('install-gates.sh')], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /ENOENT/);
  assert.match(r.out, /could not write the baseline/);
});

test('install-gates.sh: --src/--ui against an existing config print the ignored notice', () => {
  const dir = fresh();
  assert.equal(run('bash', [gate('install-gates.sh'), '--ui', 'src/ui'], dir).code, 0);
  const r = run('bash', [gate('install-gates.sh'), '--ui', 'x'], dir);
  assert.match(r.out, /lumux-gates\.json kept; --src\/--ui ignored, edit the file/);
  const plain = run('bash', [gate('install-gates.sh')], dir);
  assert.doesNotMatch(plain.out, /ignored/);
});
