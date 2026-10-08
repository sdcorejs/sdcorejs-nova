// Dist contract checker (INV-004): every source 'use client' file keeps the
// directive first in dist and every other file has none; relative specifiers
// end in .js and resolve; the root barrel has no directive and no `export *`;
// every `exports` target exists. CLI: `node scripts/check-dist.mjs` (after build).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTIVE = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"](use (?:client|server))['"];?/u;
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gu;

export function listDistModules(distDir) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.js')) out.push(path.relative(distDir, full).replaceAll('\\', '/'));
    }
  };
  if (existsSync(distDir)) walk(distDir);
  return out.sort();
}

export function readDirective(code) {
  return DIRECTIVE.exec(code)?.[1] ?? null;
}

export function relativeImports(code) {
  return [...code.matchAll(IMPORT)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((specifier) => specifier.startsWith('.'));
}

/**
 * Regular files matching a single-`*` export target such as `./dist/styles/*.css`
 * (only the last segment may contain the wildcard; no recursion).
 */
export function matchExportPattern(root, pattern) {
  const directory = path.posix.dirname(pattern);
  const filePattern = path.posix.basename(pattern);
  if (directory.includes('*') || filePattern.split('*').length !== 2) return [];
  const [prefix, suffix] = filePattern.split('*');
  const absolute = path.join(root, directory);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) return [];
  return readdirSync(absolute)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix) && name.length >= prefix.length + suffix.length)
    .filter((name) => statSync(path.join(absolute, name)).isFile())
    .sort()
    .map((name) => `${directory}/${name}`);
}

export function checkDist(root) {
  const errors = [];
  const dist = path.join(root, 'dist');
  const src = path.join(root, 'src');
  const modules = listDistModules(dist);
  if (modules.length === 0) return ['dist has no modules (run npm run build)'];

  for (const file of modules) {
    const code = readFileSync(path.join(dist, file), 'utf8');
    const source = ['.tsx', '.ts'].map((ext) => path.join(src, file.replace(/\.js$/u, ext))).find((candidate) => existsSync(candidate));
    const expected = source ? readDirective(readFileSync(source, 'utf8')) : null;
    const actual = readDirective(code);
    if (expected !== actual) errors.push(`${file}: directive ${actual ?? 'none'} but source has ${expected ?? 'none'}`);
    for (const specifier of relativeImports(code)) {
      if (!specifier.endsWith('.js')) errors.push(`${file}: relative import ${specifier} must end in .js`);
      else if (!existsSync(path.resolve(path.dirname(path.join(dist, file)), specifier))) errors.push(`${file}: ${specifier} does not resolve`);
    }
  }

  const index = readFileSync(path.join(dist, 'index.js'), 'utf8');
  if (readDirective(index)) errors.push('index.js: the root barrel must not carry a directive');
  if (/export\s*\*/u.test(index) || /export\s*\*/u.test(readFileSync(path.join(dist, 'index.d.ts'), 'utf8'))) {
    errors.push('root barrel must re-export by name, never export *');
  }

  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    for (const file of typeof target === 'string' ? [target] : Object.values(target)) {
      if (file.includes('*')) {
        if (matchExportPattern(root, file).length === 0) errors.push(`exports["${key}"] pattern ${file} matches no regular file`);
      } else if (!existsSync(path.join(root, file))) {
        errors.push(`exports["${key}"] target ${file} is missing`);
      }
    }
  }
  return errors;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const errors = checkDist(fileURLToPath(new URL('..', import.meta.url)));
  for (const error of errors) console.error(`check-dist: ${error}`);
  if (errors.length) process.exit(1);
  console.log('check-dist: directives, specifiers, root barrel and exports targets OK');
}
