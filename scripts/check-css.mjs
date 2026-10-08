// CSS contract checker (INV-006) on the Lightning CSS stylesheet AST:
// - every file starts with `@layer nova.tokens, nova.base, nova.components;`
// - every rule lives in the nova layer that matches the file kind
// - every selector is scoped by a `.nova-*` class; no :root/html/body
// - custom properties are only `--nova-*` and are only declared on `.nova-theme`
// - outside tokens.css every `var(--nova-*)` carries the exact light fallback
// CLI: `node scripts/check-css.mjs` checks dist/tokens.css, dist/styles/*.css, dist/styles.css.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { transform } from 'lightningcss';

import { fallbackTokenMap } from './build-css.mjs';

const LAYERS_BY_KIND = {
  tokens: ['nova.tokens'],
  base: ['nova.base'],
  component: ['nova.components'],
  bundle: ['nova.base', 'nova.components'],
};
const ORDER = 'nova.tokens,nova.base,nova.components';
const NESTED_AT_RULES = new Set(['media', 'supports', 'container']);
const fallbacks = await fallbackTokenMap();

function selectorParts(components, info) {
  for (const part of components) {
    if (part.type === 'class') info.classes.push(part.name);
    if (part.type === 'type') info.types.push(part.name);
    if (part.type === 'pseudo-class') {
      info.pseudo.push(part.kind);
      if (Array.isArray(part.selectors)) for (const inner of part.selectors) selectorParts(inner, info);
      if (part.selector) selectorParts(part.selector, info);
    }
  }
  return info;
}

// A selector is split into compounds at combinators; the last one is the subject.
function compounds(selector) {
  const out = [[]];
  for (const part of selector) {
    if (part.type === 'combinator') out.push([]);
    else out.at(-1).push(part);
  }
  return out.filter((compound) => compound.length > 0);
}

const ALL_BRANCHES = new Set(['is', 'where', 'matches', 'any']);
const INTO = new Set(['descendant', 'child']);

// Scope of the element a compound or selector matches, relative to Nova elements:
// NONE, WITHIN (the element is a Nova element or inside one) or INSIDE (strictly
// inside one, so its siblings are inside too).
const NONE = 0;
const WITHIN = 1;
const INSIDE = 2;

// Classes inside :not() or :has() never count; :is()/:where() count with the
// weakest scope among their branches.
function compoundScope(compound, test) {
  let scope = NONE;
  for (const part of compound) {
    if (part.type === 'class' && test(part.name)) scope = Math.max(scope, WITHIN);
    if (part.type === 'pseudo-class' && ALL_BRANCHES.has(part.kind) && Array.isArray(part.selectors) && part.selectors.length > 0) {
      scope = Math.max(scope, Math.min(...part.selectors.map((branch) => selectorScope(branch, test))));
    }
  }
  return scope;
}

// Walks the compounds left to right: a descendant/child step puts the next element
// strictly inside a scoped one; a sibling step keeps only a strict scope.
function selectorScope(selector, test) {
  let scope = NONE;
  const list = [];
  for (const part of selector) {
    if (part.type === 'combinator') {
      if (part.value !== 'pseudo-element') list.push({ combinator: part.value, compound: [] });
    } else {
      if (list.length === 0) list.push({ combinator: null, compound: [] });
      list.at(-1).compound.push(part);
    }
  }
  for (const { combinator: step, compound } of list) {
    if (step === null) scope = NONE;
    else if (INTO.has(step)) scope = scope >= WITHIN ? INSIDE : NONE;
    else scope = scope === INSIDE ? INSIDE : NONE;
    scope = Math.max(scope, compoundScope(compound, test));
  }
  return scope;
}

/** The subject is a Nova element or inside one. */
function selectorRequires(selector, test) {
  return selectorScope(selector, test) >= WITHIN;
}

/** The subject element itself (not a pseudo-element) carries the class in every branch. */
function subjectIs(selector, test) {
  const list = compounds(selector);
  const subject = list.at(-1) ?? [];
  if (subject.some((part) => part.type === 'pseudo-element')) return false;
  return subject.some((part) => {
    if (part.type === 'class') return test(part.name);
    return part.type === 'pseudo-class' && ALL_BRANCHES.has(part.kind) && Array.isArray(part.selectors)
      && part.selectors.length > 0 && part.selectors.every((branch) => subjectIs(branch, test));
  });
}

const isNovaClass = (name) => name.startsWith('nova-');
const isThemeClass = (name) => name === 'nova-theme';

function describeSelector(components) {
  return components.map((part) => part.name ?? part.kind ?? part.value ?? part.type).join(' ');
}

function visitValues(value, onVar) {
  if (Array.isArray(value)) {
    for (const item of value) visitValues(item, onVar);
  } else if (value && typeof value === 'object') {
    if (value.type === 'var' && value.value?.name?.ident) onVar(value.value);
    for (const key of Object.keys(value)) visitValues(value[key], onVar);
  }
}

// lightningcss prints equivalent values in its shortest form (150ms → .15s);
// compare times in milliseconds so the printed fallback still matches.
function normalizeToken(token) {
  if (token.type === 'time' && token.value?.type === 'seconds') {
    return { type: 'time', value: { type: 'milliseconds', value: Math.round(token.value.value * 1e6) / 1e3 } };
  }
  return token;
}

const canonical = (tokens) => JSON.stringify(
  (tokens ?? []).filter((token, index, list) => !(token.type === 'token' && token.value?.type === 'white-space'
    && (index === 0 || index === list.length - 1))).map(normalizeToken),
);

export function checkCss(css, { kind, filename = 'stylesheet.css' }) {
  const errors = [];
  const fail = (message) => errors.push(`${filename}: ${message}`);
  const allowedLayers = LAYERS_BY_KIND[kind];
  if (!allowedLayers) return [`${filename}: unknown kind ${kind}`];

  function checkVar(variable) {
    const name = variable.name.ident;
    if (!name.startsWith('--nova-')) {
      fail(`var(${name}) uses a custom property outside --nova-*`);
      return;
    }
    if (kind === 'tokens') return;
    const expected = fallbacks.get(name);
    if (!expected) {
      fail(`var(${name}) references an unknown token`);
    } else if (!variable.fallback) {
      fail(`var(${name}) has no light fallback`);
    } else if (canonical(variable.fallback) !== canonical(expected)) {
      fail(`var(${name}) fallback does not equal the light token value`);
    }
  }

  function checkDeclarations(block, scopedToTheme) {
    for (const declaration of [...(block?.declarations ?? []), ...(block?.importantDeclarations ?? [])]) {
      // lightningcss also reports untyped standard properties (e.g. outline-offset
      // with var()) as `custom`; only dashed names are custom properties.
      if (declaration.property === 'custom' && declaration.value.name.startsWith('--')) {
        const name = declaration.value.name;
        if (!name.startsWith('--nova-')) fail(`custom property ${name} is outside --nova-*`);
        else if (!scopedToTheme) fail(`declares ${name} outside .nova-theme`);
      }
      visitValues(declaration, checkVar);
    }
  }

  function checkStyleRule(rule) {
    let themeScoped = rule.value.selectors.length > 0;
    for (const selector of rule.value.selectors) {
      const info = selectorParts(selector, { classes: [], types: [], pseudo: [] });
      const label = describeSelector(selector);
      if (info.pseudo.includes('root')) fail(`selector "${label}" targets :root`);
      for (const type of info.types) {
        if (type === 'html' || type === 'body') fail(`selector "${label}" targets ${type}`);
      }
      if (!selectorRequires(selector, isNovaClass)) {
        fail(`selector "${label}" is not guaranteed to be scoped by a .nova-* class`);
      }
      if (!subjectIs(selector, isThemeClass)) themeScoped = false;
    }
    checkDeclarations(rule.value.declarations, themeScoped);
    for (const nested of rule.value.rules ?? []) checkNested(nested);
  }

  function checkNested(rule) {
    if (rule.type === 'style') checkStyleRule(rule);
    else if (NESTED_AT_RULES.has(rule.type)) for (const inner of rule.value.rules) checkNested(inner);
    else if (rule.type === 'keyframes') {
      const name = rule.value.name?.value ?? '';
      if (!String(name).startsWith('nova-')) fail(`@keyframes ${name} is outside the nova- namespace`);
      for (const frame of rule.value.keyframes) checkDeclarations(frame.declarations, false);
    } else fail(`@${rule.type} is not allowed inside a nova layer`);
  }

  let sheet;
  try {
    transform({ filename, code: Buffer.from(css), visitor: { StyleSheet(value) { sheet = value; } } });
  } catch (error) {
    return [`${filename}: parse error ${error.message}`];
  }
  const rules = sheet?.rules ?? [];
  const first = rules[0];
  if (first?.type !== 'layer-statement' || first.value.names.map((name) => name.join('.')).join(',') !== ORDER) {
    fail('must start with the layer order statement @layer nova.tokens, nova.base, nova.components;');
  }
  for (const rule of rules) {
    if (rule.type === 'layer-statement') {
      if (rule.value.names.map((name) => name.join('.')).join(',') !== ORDER) fail('unexpected @layer statement');
    } else if (rule.type === 'layer-block') {
      const name = (rule.value.name ?? []).join('.');
      if (!allowedLayers.includes(name)) {
        fail(`rule in layer "${name || '<anonymous>'}" is outside the ${kind} nova layer(s) ${allowedLayers.join(', ')}`);
        continue;
      }
      for (const inner of rule.value.rules) checkNested(inner);
    } else {
      fail(`${rule.type} rule outside nova layers`);
    }
  }
  return errors;
}

function kindOf(relative) {
  if (relative === 'tokens.css') return 'tokens';
  if (relative === 'styles.css') return 'bundle';
  if (relative === 'styles/base.css') return 'base';
  return 'component';
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const files = ['tokens.css', 'styles.css'].filter((file) => existsSync(path.join(dist, file)));
  if (existsSync(path.join(dist, 'styles'))) {
    for (const file of readdirSync(path.join(dist, 'styles')).filter((name) => name.endsWith('.css')).sort()) {
      files.push(`styles/${file}`);
    }
  }
  const errors = files.includes('tokens.css') ? [] : ['dist/tokens.css is missing (run build:css)'];
  for (const file of files) {
    errors.push(...checkCss(readFileSync(path.join(dist, file), 'utf8'), { kind: kindOf(file), filename: `dist/${file}` }));
  }
  for (const error of errors) console.error(`check-css: ${error}`);
  if (errors.length) process.exit(1);
  console.log(`check-css: ${files.length} file(s) OK — ${files.join(', ')}`);
}
