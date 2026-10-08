// Manifest/lockfile contract checker (INV-004, INV-005).
// Library: checkManifest / checkLockfile return a list of violations.
// CLI: `node scripts/check-package.mjs` checks the real package.json and lockfile.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const P0_JS_SUBPATHS = [
  '.', './theme', './i18n', './types', './button', './avatar', './badge', './card', './link',
  './breadcrumb', './alert', './data-state', './field', './input', './checkbox', './switch', './radio-group',
];
export const P0_CSS_SUBPATHS = ['./tokens.css', './styles.css', './styles/*.css'];
export const P0_SUBPATHS = [...P0_JS_SUBPATHS, ...P0_CSS_SUBPATHS];

const RUNTIME_DEPENDENCIES = ['@base-ui/react'];
const PEERS = { react: '^19.0.0', 'react-dom': '^19.0.0' };
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const FORBIDDEN_NAMES = new Set([
  'tailwindcss', 'tailwind-merge', 'antd', 'openai',
  // icon packages (D-012: inline SVG only)
  'lucide', 'lucide-react', 'react-icons', 'react-feather', 'phosphor-react', '@mui/icons-material',
  '@ant-design/icons',
]);
const FORBIDDEN_SCOPES = ['@angular/', '@radix-ui/', '@openai/', '@heroicons/', '@tabler/', '@fortawesome/', '@phosphor-icons/', '@iconify/'];

export function isForbiddenPackage(name) {
  return FORBIDDEN_NAMES.has(name) || FORBIDDEN_SCOPES.some((scope) => name.startsWith(scope));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A target inside ./dist (forward slashes only, no traversal) ending in `extension`. */
function isDistTarget(value, extension) {
  return typeof value === 'string' && value.startsWith('./dist/') && value.endsWith(extension) && !value.includes('\\')
    && value.split('/').slice(1).every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

/** Package name behind a dependency specifier: `npm:<name>@<range>` aliases resolve to <name>. */
export function aliasTarget(specifier) {
  if (typeof specifier !== 'string' || !specifier.startsWith('npm:')) return null;
  const rest = specifier.slice(4);
  const at = rest.indexOf('@', rest.startsWith('@') ? 1 : 0);
  return at < 0 ? rest : rest.slice(0, at);
}

/**
 * Registry package installed for `name`: the alias target for `npm:` specifiers, `name` for
 * a plain version range, null for protocols that install something other than a registry
 * package (file:, link:, git, URLs, workspace:).
 */
function runtimeIdentity(name, specifier) {
  if (typeof specifier !== 'string') return null;
  if (specifier.startsWith('npm:')) return aliasTarget(specifier);
  return /^[a-z+]+:|\/|\\/iu.test(specifier) ? null : name;
}

function forbiddenInDependencyMap(map, label, errors) {
  for (const [name, specifier] of Object.entries(isPlainObject(map) ? map : {})) {
    if (isForbiddenPackage(name)) errors.push(`${label}: forbidden package ${name}`);
    const alias = aliasTarget(specifier);
    if (alias && isForbiddenPackage(alias)) errors.push(`${label}: ${name} is an alias of forbidden package ${alias}`);
  }
}

export function checkManifest(manifest) {
  const errors = [];
  if (!isPlainObject(manifest)) return ['manifest must be an object'];
  if (manifest.type !== 'module') errors.push('type must be "module"');

  const exportsMap = isPlainObject(manifest.exports) ? manifest.exports : {};
  for (const key of P0_JS_SUBPATHS) {
    const target = exportsMap[key];
    if (!isPlainObject(target)) {
      errors.push(`exports["${key}"] must be an object with types and default`);
      continue;
    }
    const conditions = Object.keys(target);
    if (conditions.length !== 2 || conditions[0] !== 'types' || conditions[1] !== 'default') {
      errors.push(`exports["${key}"] must declare exactly "types" then "default"`);
    }
    if (!isDistTarget(target.types, '.d.ts')) errors.push(`exports["${key}"].types must be a ./dist/**/*.d.ts path`);
    if (!isDistTarget(target.default, '.js')) errors.push(`exports["${key}"].default must be a ./dist/**/*.js path`);
    else if (typeof target.types === 'string' && target.types.replace(/.d.ts$/u, '.js') !== target.default) {
      errors.push(`exports["${key}"] declaration and JavaScript targets must be the same module`);
    }
  }
  for (const key of P0_CSS_SUBPATHS) {
    if (!isDistTarget(exportsMap[key], '.css')) {
      errors.push(`exports["${key}"] must point to a compiled ./dist/**/*.css file`);
    }
  }
  for (const key of Object.keys(exportsMap)) {
    if (!P0_SUBPATHS.includes(key)) errors.push(`exports["${key}"] is not a P0 public subpath`);
  }

  const runtime = Object.keys(manifest.dependencies ?? {});
  // optional dependencies are installed at runtime too: same allowlist, for the install key
  // and for the package actually installed behind it
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [name, specifier] of Object.entries(isPlainObject(manifest[field]) ? manifest[field] : {})) {
      if (!RUNTIME_DEPENDENCIES.includes(name)) errors.push(`${field}: ${name} is not an allowed runtime dependency`);
      else if (runtimeIdentity(name, specifier) !== name) errors.push(`${field}: ${name} must install the registry package ${name}, not ${specifier}`);
    }
  }
  for (const name of RUNTIME_DEPENDENCIES) {
    if (!runtime.includes(name)) errors.push(`dependencies: ${name} is required`);
  }

  const peers = manifest.peerDependencies ?? {};
  const peerKeys = Object.keys(peers);
  if (peerKeys.length !== Object.keys(PEERS).length
    || Object.entries(PEERS).some(([name, range]) => peers[name] !== range)) {
    errors.push(`peerDependencies must be exactly ${JSON.stringify(PEERS)}`);
  }

  const sideEffects = manifest.sideEffects;
  if (!Array.isArray(sideEffects) || sideEffects.length !== 1 || sideEffects[0] !== '**/*.css') {
    errors.push('sideEffects must be ["**/*.css"]');
  }

  for (const field of DEPENDENCY_FIELDS) forbiddenInDependencyMap(manifest[field], field, errors);
  return errors;
}

export function checkLockfile(lockfile) {
  const errors = [];
  if (!isPlainObject(lockfile)) return ['lockfile must be an object'];
  const packages = isPlainObject(lockfile.packages) ? lockfile.packages : {};
  for (const [key, entry] of Object.entries(packages)) {
    const marker = key.lastIndexOf('node_modules/');
    const name = marker < 0 ? null : key.slice(marker + 'node_modules/'.length);
    if (name && isForbiddenPackage(name)) errors.push(`lockfile: forbidden package ${name} (${key})`);
    // aliased installs keep the real identity in `name`
    if (isPlainObject(entry) && typeof entry.name === 'string' && entry.name !== name && isForbiddenPackage(entry.name)) {
      errors.push(`lockfile: ${key || '<root>'} resolves to forbidden package ${entry.name}`);
    }
    if (isPlainObject(entry)) {
      for (const field of DEPENDENCY_FIELDS) forbiddenInDependencyMap(entry[field], `lockfile ${key || '<root>'} ${field}`, errors);
    }
  }
  return [...new Set(errors)];
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const root = new URL('../', import.meta.url);
  const read = (file) => JSON.parse(readFileSync(new URL(file, root), 'utf8'));
  const errors = [...checkManifest(read('package.json')), ...checkLockfile(read('package-lock.json'))];
  for (const error of errors) console.error(`check-package: ${error}`);
  if (errors.length) process.exit(1);
  console.log('check-package: manifest and lockfile OK');
}
