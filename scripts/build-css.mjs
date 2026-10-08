// CSS build (D-007, D-013, D-017): tokens.css from src/tokens/tokens.ts, and
// component/base CSS with every `var(--nova-x)` given its light fallback
// (`var(--nova-x, <light>)`) so components render correctly outside a provider.
// Usage: `node scripts/build-css.mjs` → dist/tokens.css, dist/styles/*.css, dist/styles.css
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundleAsync, transform } from 'lightningcss';
import ts from 'typescript';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC_STYLES = path.join(ROOT, 'src', 'styles');
const DIST = path.join(ROOT, 'dist');

let tokensModule;

/** Load the TypeScript token source without a prior tsc build (no flags needed). */
export async function loadTokens() {
  if (!tokensModule) {
    const source = readFileSync(path.join(ROOT, 'src', 'tokens', 'tokens.ts'), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    tokensModule = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  }
  return tokensModule;
}

function parseFallback(name, value) {
  let fallback;
  transform({
    filename: 'fallback.css',
    code: Buffer.from(`.x{color:var(${name}, ${value})}`),
    visitor: {
      StyleSheet(sheet) {
        fallback = sheet.rules[0].value.declarations.declarations[0].value.value[0].value.fallback;
      },
    },
  });
  return fallback;
}

let fallbackTokens;

/** `--nova-*` → parsed fallback token list (shared with the checker for AST comparison). */
export async function fallbackTokenMap() {
  if (!fallbackTokens) {
    const { lightFallbacks } = await loadTokens();
    fallbackTokens = new Map(Object.entries(lightFallbacks()).map(([name, value]) => [name, parseFallback(name, value)]));
  }
  return fallbackTokens;
}

function fallbackVisitor(map, filename) {
  return {
    Variable(variable) {
      const name = variable.name.ident;
      if (!name.startsWith('--nova-') || variable.fallback) return undefined;
      const fallback = map.get(name);
      if (!fallback) throw new Error(`${filename}: unknown token ${name}`);
      // lightningcss serializes `from: null` as a missing Specifier; omit it.
      const { from, ...reference } = variable.name;
      return { type: 'var', value: { name: from ? variable.name : reference, fallback } };
    },
  };
}

const LAYER_ORDER = '@layer nova.tokens, nova.base, nova.components;';

// lightningcss drops names from a layer statement when a later block declares
// them; every emitted file must still pin the full public order first (§8.1).
function pinLayerOrder(code) {
  const body = code.replace(/^@layer [^{};]+;\s*$/gmu, '').trimStart();
  return `${LAYER_ORDER}\n\n${body}`;
}

export async function injectFallbacks(css, filename = 'input.css') {
  const map = await fallbackTokenMap();
  const { code } = transform({ filename, code: Buffer.from(css), visitor: fallbackVisitor(map, filename) });
  return pinLayerOrder(code.toString());
}

function assertInside(target, parent) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(parent + path.sep)) throw new Error(`refusing to touch ${resolved} outside ${parent}`);
  return resolved;
}

export async function buildCss() {
  const { generateTokensCss } = await loadTokens();
  const outStyles = assertInside(path.join(DIST, 'styles'), DIST);
  rmSync(outStyles, { recursive: true, force: true });
  mkdirSync(outStyles, { recursive: true });
  writeFileSync(path.join(DIST, 'tokens.css'), generateTokensCss());

  const written = ['dist/tokens.css'];
  const sources = [['base.css', path.join(SRC_STYLES, 'base.css')]];
  const componentsDir = path.join(SRC_STYLES, 'components');
  if (existsSync(componentsDir)) {
    for (const file of readdirSync(componentsDir).filter((name) => name.endsWith('.css')).sort()) {
      sources.push([file, path.join(componentsDir, file)]);
    }
  }
  for (const [name, file] of sources) {
    if (!existsSync(file)) continue;
    writeFileSync(path.join(outStyles, name), await injectFallbacks(readFileSync(file, 'utf8'), file));
    written.push(`dist/styles/${name}`);
  }

  const index = path.join(SRC_STYLES, 'index.css');
  const bundled = path.join(DIST, 'styles.css');
  rmSync(assertInside(bundled, DIST), { force: true });
  if (existsSync(index)) {
    const map = await fallbackTokenMap();
    const { code } = await bundleAsync({ filename: index, visitor: fallbackVisitor(map, index) });
    writeFileSync(bundled, pinLayerOrder(code.toString()));
    written.push('dist/styles.css');
  }
  return written;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const written = await buildCss();
  console.log(`build-css: wrote ${written.join(', ')}`);
}
