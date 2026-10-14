// Tarball smoke (PKG-AC01): build, `npm pack` at the repo root (generated *.tgz),
// check the tarball contents, then install it into each consumer fixture with
// --no-save (the fixture lockfile pins only third-party deps) and build it.
// Usage: node scripts/smoke-pack.mjs [fixture ...]   (default: every fixtures/* with a package.json)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
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
  const parent=path.join(ROOT,'.sdcorejs','tmp');mkdirSync(parent,{recursive:true});
  const destination=mkdtempSync(path.join(parent,'nova-pack-'));
  const [packed] = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts','--pack-destination',destination], ROOT));
  const files = packed.files.map((entry) => entry.path);
  const missing = REQUIRED.filter((file) => !files.includes(file));
  const leaked = files.filter((file) => /^(src|test|fixtures|scripts|\.sdcorejs)\//u.test(file) || /\.test\./u.test(file));
  if (missing.length || leaked.length) {
    throw new Error(`tarball contents wrong: missing [${missing.join(', ')}], leaked [${leaked.join(', ')}]`);
  }
  console.log(`smoke-pack: ${packed.filename} (${files.length} files, ${packed.size} bytes)`);
  return path.join(destination, packed.filename);
}

export function installFixture(name, tarball) {
  const dir = inside(FIXTURES, path.join(FIXTURES, name));
  run('npm', existsSync(path.join(dir, 'package-lock.json')) ? ['ci', '--no-audit', '--no-fund'] : ['install', '--no-audit', '--no-fund'], dir);
  run('npm', ['install', '--no-save', '--no-audit', '--no-fund', path.relative(dir, tarball).replaceAll('\\', '/')], dir);
  run('npm', ['run', 'build'], dir);
}


// A separate consumer outside the repository cannot accidentally resolve engines
// or React types from the development checkout's node_modules.
export function verifyCoreWithoutPeers(tarball) {
  const dir=mkdtempSync(path.join(tmpdir(),'nova-core-without-peers-'));
  writeFileSync(path.join(dir,'package.json'),JSON.stringify({
    name:'nova-core-without-peers',private:true,type:'module',
    dependencies:{react:'19.3.0','react-dom':'19.3.0'},
    devDependencies:{'@types/react':'19.3.0','@types/react-dom':'19.3.0'}
  },null,2));
  run('npm',['install','--ignore-scripts','--omit=optional','--no-audit','--no-fund',tarball],dir);
  writeFileSync(path.join(dir,'consumer.mjs'),`
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {NovaProvider,DatePicker,TimeInput,NumberInput} from '@sdcorejs/nova';
const require=createRequire(import.meta.url);
const packageRequire=createRequire(require.resolve('@sdcorejs/nova'));
for(const resolver of [require,packageRequire])for(const peer of ['react-hook-form','@js-temporal/polyfill'])assert.throws(()=>resolver.resolve(peer),{code:'MODULE_NOT_FOUND'});
const html=renderToString(createElement(NovaProvider,null,createElement('form',null,
 createElement(DatePicker,{label:'Date',name:'date',referenceDate:'2024-02-29',defaultValue:'2024-02-29'}),
 createElement(TimeInput,{label:'Time',name:'time',defaultValue:'00:00'}),
 createElement(NumberInput,{label:'Number',name:'number',defaultValue:0}))));
assert.match(html,/value="00:00"/);assert.match(html,/value="2024-02-29"/);assert.match(html,/value="0"/);
console.log('packed core runtime: PASS; optional engines absent');
`);
  run('node',['consumer.mjs'],dir);
  writeFileSync(path.join(dir,'consumer.tsx'),`
import {DatePicker,TimeInput,NumberInput,UnsavedChangesProvider} from '@sdcorejs/nova';
import {Calendar} from '@sdcorejs/nova/date-picker';
export const consumer=<UnsavedChangesProvider renderPrompt={()=>null}><DatePicker label="Date" referenceDate="2024-02-29"/><Calendar label="Calendar" referenceDate="2024-02-29"/><TimeInput label="Time" defaultValue="00:00"/><NumberInput label="Number" defaultValue={0}/></UnsavedChangesProvider>;
`);
  const args=['--noEmit','--strict','--skipLibCheck','false','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--jsx','react-jsx','consumer.tsx'];
  run('node',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--ignoreConfig',...args],dir);
  run('node',[path.join(ROOT,'node_modules/typescript-5.7/bin/tsc'),...args],dir);
  console.log('smoke-pack: isolated runtime and TS 6 / 5.7 declarations PASS');
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const requested = process.argv.slice(2);
  const fixtures = requested.length
    ? requested
    : readdirSync(FIXTURES).filter((name) => existsSync(path.join(FIXTURES, name, 'package.json'))).sort();
  const tarball = packTarball();
  verifyCoreWithoutPeers(tarball);
  for (const name of fixtures) installFixture(name, tarball);
  console.log(`smoke-pack: OK — ${fixtures.join(', ')}`);
}
