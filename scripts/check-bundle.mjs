// Bundle isolation check (PKG-AC02, INV-005, INV-011) on a consumer production
// build: source maps list every bundled module, so we can prove that importing
// one subpath pulls no other component module and exactly one React/ReactDOM,
// and that the compiled CSS (tokens + that component) is present.
// CLI: `node scripts/check-bundle.mjs` (after `npm run smoke:pack`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPONENT = /@sdcorejs\/nova\/dist\/components\/([^/]+)\//u;
const OTHER_COMPONENT_CSS = /\.nova-(alert|avatar|badge|breadcrumb|card|checkbox|data-state|empty|field|input|link|progress|radio|skeleton|spinner|switch)[\w-]*\s*[{,.:[]/u;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function analyzeBundle(distDir) {
  if (!existsSync(distDir)) return { modules: [], css: '' };
  const files = walk(distDir);
  const modules = files
    .filter((file) => file.endsWith('.js.map'))
    .flatMap((file) => JSON.parse(readFileSync(file, 'utf8')).sources ?? [])
    .map((source) => source.replaceAll('\\', '/'));
  const css = files.filter((file) => file.endsWith('.css')).map((file) => readFileSync(file, 'utf8')).join('\n');
  return { modules, css };
}

/** Package roots of `name` found in module paths, e.g. `node_modules/react`. */
function packageRoots(modules, name) {
  const marker = `node_modules/${name}/`;
  const roots = new Set();
  for (const module of modules) {
    const index = module.lastIndexOf(marker);
    if (index >= 0) roots.add(module.slice(0, index + marker.length));
  }
  return roots;
}

export function checkBundle({ modules, css }, { entry }) {
  const errors = [];
  const components = new Set(modules.map((module) => COMPONENT.exec(module)?.[1]).filter(Boolean));
  if (!components.has(entry)) errors.push(`bundle does not contain the ${entry} component`);
  for (const component of components) {
    if (component !== entry) errors.push(`bundle pulls another component module: ${component}`);
  }
  for (const name of ['react', 'react-dom']) {
    const roots = packageRoots(modules, name);
    if (roots.size !== 1) errors.push(`expected exactly one ${name} copy, found ${roots.size}: ${[...roots].join(', ')}`);
  }
  if (!css.trim()) errors.push('no compiled CSS in the bundle');
  else {
    if (!css.includes(`.nova-${entry}`)) errors.push(`CSS lacks .nova-${entry} rules`);
    if (!/--nova-[\w-]+\s*:/u.test(css)) errors.push('CSS lacks the --nova-* token declarations (tokens.css)');
    const other = OTHER_COMPONENT_CSS.exec(css);
    if (other) errors.push(`CSS contains another component's rules: .nova-${other[1]}`);
  }
  return errors;
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const dist = fileURLToPath(new URL('../fixtures/bundle-isolation/dist', import.meta.url));
  const analysis = analyzeBundle(dist);
  const errors = analysis.modules.length === 0
    ? ['fixtures/bundle-isolation/dist has no source maps (run npm run smoke:pack)']
    : checkBundle(analysis, { entry: 'button' });
  for (const error of errors) console.error(`check-bundle: ${error}`);
  if (errors.length) process.exit(1);
  const nova = analysis.modules.filter((module) => module.includes('@sdcorejs/nova/'));
  console.log(`check-bundle: OK — ${analysis.modules.length} modules (${nova.length} from @sdcorejs/nova, only components/button), one react, one react-dom, CSS ${analysis.css.length} bytes`);
}
