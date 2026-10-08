// Tarball smoke (PKG-AC01): build, `npm pack` at the repo root (generated *.tgz),
// check the tarball contents, then install it into each consumer fixture with
// --no-save (the fixture lockfile pins only third-party deps) and build it.
// Usage: node scripts/smoke-pack.mjs [fixture ...]   (default: every fixtures/* with a package.json)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURES = path.join(ROOT, 'fixtures');
const REQUIRED = ['package.json', 'dist/index.js', 'dist/index.d.ts', 'dist/tokens.css', 'dist/styles.css', 'dist/styles/button.css', 'dist/components/button/index.js'];

function run(command, args, cwd) {
  console.log(`smoke-pack: (${path.relative(ROOT, cwd) || '.'}) ${command} ${args.join(' ')}`);
  // npm is a .cmd shim on Windows; arguments are fixed strings from this script.
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '');
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd} (exit ${result.status})`);
  }
  return result.stdout;
}

function inside(parent, target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(parent + path.sep)) throw new Error(`refusing to touch ${resolved} outside ${parent}`);
  return resolved;
}

export function packTarball() {
  run('npm', ['run', 'build'], ROOT);
  for (const name of readdirSync(ROOT).filter((file) => /^sdcorejs-nova-.*\.tgz$/u.test(file))) {
    rmSync(inside(ROOT, path.join(ROOT, name)));
  }
  const [packed] = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts'], ROOT));
  const files = packed.files.map((entry) => entry.path);
  const missing = REQUIRED.filter((file) => !files.includes(file));
  const leaked = files.filter((file) => /^(src|test|fixtures|scripts|\.sdcorejs)\//u.test(file) || /\.test\./u.test(file));
  if (missing.length || leaked.length) {
    throw new Error(`tarball contents wrong: missing [${missing.join(', ')}], leaked [${leaked.join(', ')}]`);
  }
  console.log(`smoke-pack: ${packed.filename} (${files.length} files, ${packed.size} bytes)`);
  return path.join(ROOT, packed.filename);
}

export function installFixture(name, tarball) {
  const dir = inside(FIXTURES, path.join(FIXTURES, name));
  run('npm', existsSync(path.join(dir, 'package-lock.json')) ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund'], dir);
  run('npm', ['install', '--no-save', '--no-audit', '--no-fund', path.relative(dir, tarball).replaceAll('\\', '/')], dir);
  run('npm', ['run', 'build'], dir);
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const requested = process.argv.slice(2);
  const fixtures = requested.length
    ? requested
    : readdirSync(FIXTURES).filter((name) => existsSync(path.join(FIXTURES, name, 'package.json'))).sort();
  const tarball = packTarball();
  for (const name of fixtures) installFixture(name, tarball);
  console.log(`smoke-pack: OK — ${fixtures.join(', ')}`);
}
