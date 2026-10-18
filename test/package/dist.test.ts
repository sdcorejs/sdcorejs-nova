// @vitest-environment node
// Dist contract (INV-002, INV-004, INV-011, INV-014). Runs on the tsc/CSS build
// output: `npm run build` must run first (see `npm run test:unit -- test/package/dist.test.ts`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

type CheckDist = {
  checkDist: (root: string) => string[];
  listDistModules: (distDir: string) => string[];
  readDirective: (code: string) => string | null;
  relativeImports: (code: string) => string[];
};


// Only exact defensive deletion tokens are projected; all other code remains raw.
const DEFENSIVE_MODULE = 'components/file-explorer/file-explorer.js';
const DEFENSIVE_SOURCE = "function safeNative(props) { const native = { ...props }; for (const key of ['role', 'dangerouslySetInnerHTML', 'children', 'aria-busy']) delete native[key]; return native; }";
const INLINE_DEFENSES = [
  {
    file: 'components/image-preview/image-preview.js', name: 'ImageContent', modifiers: '',
    parameter: "{ src, alt, onError, onDownload, ref, onKeyDown, onClick, className, style, 'data-testid': testId, ...rest }",
    statements: "const native = { ...rest }; for (const key of ['children', 'dangerouslySetInnerHTML', 'defaultValue', 'defaultChecked', 'aria-label', 'aria-labelledby', 'aria-busy', 'role', 'tabIndex', 'data-zoom']) delete native[key];",
  },
  {
    file: 'components/pdf-preview/pdf-preview.js', name: 'PdfPreview', modifiers: 'export',
    parameter: "{ source, adapter, title, onDownload, onPrint, ref, onClick, className, style, 'data-testid': testId, ...rest }",
    statements: "const native = { ...rest }; for (const key of ['children', 'dangerouslySetInnerHTML', 'defaultValue', 'defaultChecked', 'aria-label', 'aria-labelledby', 'aria-busy', 'role']) delete native[key];",
  },
] as const;
function syntaxTokens(text: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const tokens: [ts.SyntaxKind, string][] = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) tokens.push([kind, scanner.getTokenText()]);
  return JSON.stringify(tokens);
}
const DEFENSIVE_TOKENS = syntaxTokens(DEFENSIVE_SOURCE);
function matchingNodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const result: ts.Node[] = [];
  const visit = (node: ts.Node) => { if (predicate(node)) result.push(node); ts.forEachChild(node, visit); };
  visit(root);
  return result;
}
function projectDefensiveNativeProp(code: string, file: string): string {
  const inline = INLINE_DEFENSES.find(item => item.file === file);
  if (file !== DEFENSIVE_MODULE && !inline) return code;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if ((source as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) return code;
  const name = inline?.name ?? 'safeNative';
  const functions = source.statements.filter((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const candidate = functions[0];
  if (functions.length !== 1 || !candidate?.body) return code;
  if (!inline) {
    if (syntaxTokens(candidate.getText(source)) !== DEFENSIVE_TOKENS) return code;
    const statements = candidate.body.statements, returned = statements[2];
    if (statements.length !== 3 || !returned || !ts.isReturnStatement(returned) ||
      !returned.expression || !ts.isIdentifier(returned.expression) || returned.expression.text !== 'native') return code;
  } else {
    if (candidate.asteriskToken || candidate.parameters.length !== 1 ||
      syntaxTokens(candidate.parameters[0]!.getText(source)) !== syntaxTokens(inline.parameter) ||
      syntaxTokens((ts.getModifiers(candidate) ?? []).map(node => node.getText(source)).join(' ')) !== syntaxTokens(inline.modifiers)) return code;
    const body = candidate.body.statements;
    const pairs = body.slice(0, -1).filter((statement, index) =>
      syntaxTokens(statement.getText(source) + ' ' + body[index + 1]!.getText(source)) === syntaxTokens(inline.statements));
    if (pairs.length !== 1) return code;
    // These exact identifier uses bind the clone, deletion, and rendered root without aliases or reintroduction.
    if (matchingNodes(candidate, node => ts.isIdentifier(node) && node.text === 'native').length !== 3 ||
      matchingNodes(candidate, node => ts.isIdentifier(node) && node.text === 'rest').length !== 2) return code;
    const returns = body.filter(ts.isReturnStatement);
    const render = returns[0]?.expression;
    if (returns.length !== 1 || !render || !ts.isCallExpression(render) ||
      !ts.isIdentifier(render.expression) || render.expression.text !== '_jsxs' || render.arguments.length !== 2) return code;
    const [tag, props] = render.arguments;
    if (!tag || !ts.isStringLiteral(tag) || tag.text !== 'section' || !props || !ts.isObjectLiteralExpression(props)) return code;
    const spreads = props.properties.filter(ts.isSpreadAssignment);
    if (spreads.length !== 1 || !spreads[0] || props.properties[0] !== spreads[0] || !ts.isIdentifier(spreads[0].expression) || spreads[0].expression.text !== 'native') return code;
    if (returns[0]!.getStart(source) < pairs[0]!.end) return code;
  }
  const tokens = matchingNodes(candidate, node => ts.isStringLiteral(node) && node.text === 'dangerouslySetInnerHTML') as ts.StringLiteral[];
  const token = tokens[0];
  if (tokens.length !== 1 || !token) return code;
  const start = token.getStart(source), literal = code.slice(start, token.end);
  if (literal !== "'dangerouslySetInnerHTML'" && literal !== '"dangerouslySetInnerHTML"') return code;
  return code.slice(0, start) + ' '.repeat(token.end - start) + code.slice(token.end);
}


// A bounded group drains before its first named failure propagates; later groups never start after failure.
async function importModuleGroups<T>(items: readonly T[], visit: (item: T) => Promise<void>, limit = 4): Promise<void> {
  for (let index = 0; index < items.length; index += limit) {
    const settled = await Promise.allSettled(items.slice(index, index + limit).map(async item => { await visit(item); }));
    const failed = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}
const NATIVE_IMPORT_PROBE = "import path from 'node:path';import{pathToFileURL}from'node:url';let input='';for await(const chunk of process.stdin)input+=chunk;const{root,files}=JSON.parse(input),visited=[];let active='before-import';const absent=()=>{if(typeof window!=='undefined'||typeof document!=='undefined'||typeof HTMLElement!=='undefined')throw Error('DOM globals are present');};try{absent();for(const file of files){active=file;const namespace=await import(pathToFileURL(path.resolve(root,file)).href);if(!namespace)throw Error('Missing module namespace');absent();visited.push(file);}console.log(JSON.stringify({files:visited}));}catch(error){console.log(JSON.stringify({failed:active,reason:error instanceof Error?error.message:String(error),files:visited}));process.exitCode=1;}";
const nativeImportChildren = new Set<ChildProcessWithoutNullStreams>();
afterEach(() => { for (const child of nativeImportChildren) child.kill(); nativeImportChildren.clear(); });
function nativeSerialImports(root: string, files: readonly string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', NATIVE_IMPORT_PROBE], { stdio: ['pipe', 'pipe', 'pipe'] });
    nativeImportChildren.add(child);
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.once('error', error => { nativeImportChildren.delete(child); reject(error); });
    child.stdin.on('error', reject);
    child.once('close', code => {
      nativeImportChildren.delete(child);
      try {
        const result = JSON.parse(stdout) as { files?: unknown; failed?: string; reason?: string };
        if (code !== 0) { reject(new Error('Native import failed for ' + (result.failed ?? 'unknown module') + ': ' + (result.reason ?? stderr))); return; }
        if (!Array.isArray(result.files) || result.files.some(file => typeof file !== 'string')) throw new Error('Invalid native import inventory');
        resolve(result.files as string[]);
      } catch (error) { reject(new Error('Invalid native import probe output: ' + String(error) + ' ' + stderr)); }
    });
    child.stdin.end(JSON.stringify({ root, files }));
  });
}

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = path.join(ROOT, 'dist');
const checker = (await import(new URL('../../scripts/check-dist.mjs', import.meta.url).href)) as CheckDist;
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  exports: Record<string, string | { types: string; default: string }>;
};

const CLIENT = [
  'components/alert/alert.js', 'components/avatar/avatar.js', 'components/breadcrumb/breadcrumb.js',
  'components/button/button.js', 'components/checkbox/checkbox.js', 'components/data-state/data-state.js',
  'components/data-state/progress.js', 'components/data-state/spinner.js', 'components/field/field.js',
  'components/field/form-errors.js', 'components/input/input.js', 'components/radio-group/radio-group.js',
  'components/switch/switch.js', 'providers/nova/context.js', 'providers/nova/nova-provider.js',
  'providers/nova/portal-scope.js', 'providers/nova/theme-provider.js', 'providers/nova/use-nova-theme.js',
];
const SERVER_COMPATIBLE = [
  'components/badge/badge.js', 'components/card/card.js', 'components/card/section.js', 'components/link/link.js',
  'components/data-state/empty.js', 'components/data-state/skeleton.js', 'components/button/button-group.js',
  'components/input/input-group.js', 'components/field/label.js', 'components/field/focus-first-invalid.js',
  'i18n/index.js', 'types/index.js', 'index.js',
];

const read = (relative: string) => readFileSync(path.join(DIST, relative), 'utf8');
const jsSubpaths = Object.entries(manifest.exports).filter(([key, target]) => key !== '.' && !key.startsWith('./adapters/') && typeof target === 'object');

let declarations:ts.Program|undefined;
function typeExports(file: string): string[] {
  const program = declarations??=ts.createProgram([path.join(DIST,'index.d.ts'),...Object.values(manifest.exports).filter(target=>typeof target==='object').map(target=>path.join(ROOT,(target as {types:string}).types))], { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, noEmit: true, skipLibCheck: true });
  const typeChecker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const symbol = source ? typeChecker.getSymbolAtLocation(source) : undefined;
  return symbol ? typeChecker.getExportsOfModule(symbol).map((item) => item.getName()).sort() : [];
}

describe('dist directives (INV-004, D-014)', () => {
  it.each(CLIENT)("client file %s keeps 'use client' first", (file) => {
    expect(checker.readDirective(read(file))).toBe('use client');
  });

  it.each(SERVER_COMPATIBLE)('server-compatible file %s has no directive', (file) => {
    expect(checker.readDirective(read(file))).toBeNull();
  });

  it('root index has no directive and no export *', () => {
    const code = read('index.js');
    expect(checker.readDirective(code)).toBeNull();
    expect(code).not.toMatch(/export\s*\*/);
    expect(read('index.d.ts')).not.toMatch(/export\s*\*/);
  });
});

describe('dist module graph (INV-002, INV-011)', () => {
  it('every relative import ends in .js and resolves to a dist file', () => {
    const modules = checker.listDistModules(DIST);
    expect(modules.length).toBeGreaterThan(40);
    for (const file of modules) {
      for (const specifier of checker.relativeImports(read(file))) {
        expect(specifier, `${file} → ${specifier}`).toMatch(/\.js$/);
        expect(existsSync(path.resolve(path.dirname(path.join(DIST, file)), specifier)), `${file} → ${specifier}`).toBe(true);
      }
    }
  });

  it('every dist module imports in Node without DOM globals', async () => {
    expect(typeof window).toBe('undefined');
    await importModuleGroups(checker.listDistModules(DIST), async file => {
      await expect(import(pathToFileURL(path.join(DIST, file)).href), file).resolves.toBeTruthy();
    }, 32);
  });

  it('no test files, no raw HTML or code evaluation in dist (INV-010, INV-014)', () => {
    for (const file of checker.listDistModules(DIST)) {
      expect(file).not.toMatch(/\.test\./);
      const code = projectDefensiveNativeProp(read(file), file);
      expect(code, file).not.toMatch(/dangerouslySetInnerHTML|\beval\(|new Function\(|createElement\(['"](script|style)['"]\)/);
    }
  });

  it('every exports target exists, including compiled CSS', () => {
    for (const [key, target] of Object.entries(manifest.exports)) {
      const files = typeof target === 'string' ? [target] : [target.types, target.default];
      for (const file of files) {
        if (file.includes('*')) continue;
        expect(existsSync(path.join(ROOT, file)), `${key} → ${file}`).toBe(true);
      }
    }
    expect(existsSync(path.join(DIST, 'styles', 'button.css'))).toBe(true);
    const bundle = read('styles.css');
    expect(bundle.startsWith('@layer nova.tokens, nova.base, nova.components;')).toBe(true);
    for (const part of ['.nova-theme', '.nova-button', '.nova-field', '.nova-radio', '.nova-progress']) expect(bundle).toContain(part);
    expect(bundle).not.toMatch(/@import/);
  });

  it('the check-dist script reports no violations', () => {
    expect(checker.checkDist(ROOT)).toEqual([]);
  });
});

describe('root barrel (Q-01, INV-004)', () => {
  it('root exports focusFirstInvalid by name', async () => {
    const root = (await import(pathToFileURL(path.join(DIST, 'index.js')).href)) as Record<string, unknown>;
    expect(typeof root.focusFirstInvalid).toBe('function');
  });

  it('root runtime exports equal the union of every subpath (named, no extras)', async () => {
    const root = Object.keys((await import(pathToFileURL(path.join(DIST, 'index.js')).href)) as object).sort();
    const union = new Set<string>();
    for (const [, target] of jsSubpaths) {
      const module = (await import(pathToFileURL(path.join(ROOT, (target as { default: string }).default)).href)) as object;
      for (const name of Object.keys(module)) union.add(name);
    }
    expect(root).toEqual([...union].sort());
    expect(root).not.toContain('PortalScope');
    expect(root).not.toContain('createTemporalAdapter');
    expect(root).not.toContain('useNovaController');
    expect(root).not.toContain('useFieldControl');
  });

  it('root declarations expose the union of every subpath type and value', () => {
    const root = typeExports(path.join(DIST, 'index.d.ts'));
    const union = new Set<string>();
    for (const [, target] of jsSubpaths) for (const name of typeExports(path.join(ROOT, (target as { types: string }).types))) union.add(name);
    expect(root).toEqual([...union].sort());
    for (const name of ['Button', 'NovaProvider', 'useNovaTheme', 'vi', 'NovaStrings', 'ValueProps', 'RadioGroupProps', 'focusFirstInvalid']) {
      expect(root).toContain(name);
    }
  }, 60_000); // one TypeScript program per subpath is slow under a full parallel run
});

// wildcard exports must match real files.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

type PatternChecker = { matchExportPattern: (root: string, pattern: string) => string[] };
const { matchExportPattern } = (await import(new URL('../../scripts/check-dist.mjs', import.meta.url).href)) as PatternChecker;

describe('wildcard export targets', () => {
  const FIXTURE = path.join(ROOT, 'test-results', 'check-dist-pattern');
  const reset = (files: Record<string, string | null>) => {
    rmSync(FIXTURE, { recursive: true, force: true });
    for (const [file, content] of Object.entries(files)) {
      const full = path.join(FIXTURE, file);
      if (content === null) mkdirSync(full, { recursive: true });
      else {
        mkdirSync(path.dirname(full), { recursive: true });
        writeFileSync(full, content);
      }
    }
  };

  it('zero regular files matching the pattern is not a match, even if the directory is not empty', () => {
    reset({ 'dist/styles/readme.txt': 'x', 'dist/styles/button.css': '.nova-a{}' });
    expect(matchExportPattern(FIXTURE, './dist/styles/*.missing.css')).toEqual([]);
    reset({ 'dist/styles/readme.txt': 'x' });
    expect(matchExportPattern(FIXTURE, './dist/styles/*.css')).toEqual([]);
  });

  it('a directory whose name matches is not a regular file', () => {
    reset({ 'dist/styles/fake.css': null });
    expect(matchExportPattern(FIXTURE, './dist/styles/*.css')).toEqual([]);
  });

  it('matches only regular files that fit the pattern', () => {
    reset({ 'dist/styles/button.css': '.nova-a{}', 'dist/styles/notes.md': 'x', 'dist/styles/nested/inner.css': '.nova-b{}' });
    expect(matchExportPattern(FIXTURE, './dist/styles/*.css')).toEqual(['./dist/styles/button.css']);
  });

  it('the real package wildcard export matches the compiled component stylesheets', () => {
    const matches = matchExportPattern(ROOT, (manifest.exports['./styles/*.css'] as string));
    expect(matches).toContain('./dist/styles/button.css');
    expect(matches.length).toBeGreaterThanOrEqual(16);
  });
});

describe('dist raw-HTML guard defensive projection controls', () => {
  const forbidden = /dangerouslySetInnerHTML|\beval\(|new Function\(|createElement\(['"](script|style)['"]\)/;
  it('recognizes only the exact defensive function and formatting trivia', () => {
    expect(projectDefensiveNativeProp(DEFENSIVE_SOURCE, DEFENSIVE_MODULE)).not.toMatch(forbidden);
    expect(projectDefensiveNativeProp(DEFENSIVE_SOURCE.replace(/ /g, '\t'), DEFENSIVE_MODULE)).not.toMatch(forbidden);
  });
  it('projects exactly one known token in the real compiled module and preserves every other byte', () => {
    const raw = read(DEFENSIVE_MODULE), projected = projectDefensiveNativeProp(raw, DEFENSIVE_MODULE);
    const literal = "'dangerouslySetInnerHTML'", start = raw.indexOf(literal);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(projected).toHaveLength(raw.length);
    expect(projected.slice(0, start)).toBe(raw.slice(0, start));
    expect(projected.slice(start, start + literal.length)).toBe(' '.repeat(literal.length));
    expect(projected.slice(start + literal.length)).toBe(raw.slice(start + literal.length));
    expect(projected).not.toMatch(forbidden);
  });
  const mutations: readonly (readonly [string, string | null, string])[] = [
    ["wrong module",null,"components/other/other.js"],
    ["ASI return with unfiltered extra statement","return native;","return\nnative;"],
    ["returns original props","return native;","return props;"],
    ["returns fresh props","return native;","return { ...props };"],
    ["returns other expression","return native;","return native.value;"],
    ["missing deletion","delete native[key];","native[key];"],
    ["wrong deletion target","delete native[key];","delete props[key];"],
    ["wrong deletion key","delete native[key];","delete native.other;"],
    ["aliases original props","{ ...props }","props"],
    ["unrelated clone","{ ...props }","{}"],
    ["call in clone","{ ...props }","{ ...read(props) }"],
    ["mutable declaration","const native","let native"],
    ["additional declaration","const native = { ...props };","const native = { ...props }, side = 1;"],
    ["default parameter","safeNative(props)","safeNative(props = {})"],
    ["rest parameter","safeNative(props)","safeNative(...props)"],
    ["async declaration","function safeNative","async function safeNative"],
    ["generator declaration","function safeNative","function* safeNative"],
    ["export modifier","function safeNative","export function safeNative"],
    ["reordered deny list","'role', 'dangerouslySetInnerHTML'","'dangerouslySetInnerHTML', 'role'"],
    ["missing deny list element",", 'aria-busy'",""],
    ["additional deny list element","'aria-busy'","'aria-busy', 'extra'"],
    ["duplicate deny list element","'aria-busy'","'aria-busy', 'dangerouslySetInnerHTML'"],
    ["computed deny list element","'role'","('role')"],
    ["block with additional loop use","delete native[key];","{ delete native[key]; read(native); }"],
    ["extra sanitizer operation","return native;","eval('0'); return native;"],
    ["malformed syntax","APPEND","\nfunction {"],
    ["duplicate function","APPEND","DUPLICATE"],
    ["actual JSX helper prop","APPEND","\n_jsx('section', { dangerouslySetInnerHTML: {__html: html} });"],
    ["raw HTML property assignment","APPEND","\nnode.dangerouslySetInnerHTML = {__html: html};"],
    ["raw HTML property access","APPEND","\nread(props.dangerouslySetInnerHTML);"],
    ["raw HTML computed access","APPEND","\nread(props['dangerouslySetInnerHTML']);"],
    ["eval outside sanitizer","APPEND","\neval('0');"],
    ["Function outside sanitizer","APPEND","\nnew Function('return 0');"],
    ["script element outside sanitizer","APPEND","\ndocument.createElement('script');"],
    ["style element outside sanitizer","APPEND","\ndocument.createElement('style');"]
  ];
  it.each(mutations)('fails closed for %s', (_name, before, after) => {
    const file = before === null ? after : DEFENSIVE_MODULE;
    const code = before === null ? DEFENSIVE_SOURCE : before === 'APPEND' ? DEFENSIVE_SOURCE + (after === 'DUPLICATE' ? '\n' + DEFENSIVE_SOURCE : after) : DEFENSIVE_SOURCE.replace(before, after);
    expect(projectDefensiveNativeProp(code, file)).toMatch(forbidden);
  });
  it.each(["eval('0');", "new Function('return 0');", "document.createElement('script');", "document.createElement('style');"])('retains the standalone forbidden operation %s', code => {
    expect(projectDefensiveNativeProp(code, DEFENSIVE_MODULE)).toMatch(forbidden);
  });
});

describe('dist inline preview defensive projection controls', () => {
  const forbidden = /dangerouslySetInnerHTML|\beval\(|new Function\(|createElement\(['"](script|style)['"]\)/;
  const sample = (defense: typeof INLINE_DEFENSES[number]) =>
    (defense.modifiers ? defense.modifiers + ' ' : '') + 'function ' + defense.name + '(' + defense.parameter + ') { ' +
    defense.statements + ' return _jsxs("section", { ...native, children: [] }); }';
  for (const defense of INLINE_DEFENSES) {
    it(defense.name + ' recognizes the exact clone/delete/render boundary and formatting trivia', () => {
      const code = sample(defense);
      expect(projectDefensiveNativeProp(code, defense.file)).not.toMatch(forbidden);
      expect(projectDefensiveNativeProp(code.replace(/ /g, '\t'), defense.file)).not.toMatch(forbidden);
    });
    it(defense.name + ' projects exactly one token in actual compiled code and keeps every other byte', () => {
      const raw = read(defense.file), projected = projectDefensiveNativeProp(raw, defense.file);
      const literal = "'dangerouslySetInnerHTML'", start = raw.indexOf(literal);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(projected).toHaveLength(raw.length);
      expect(projected.slice(0, start)).toBe(raw.slice(0, start));
      expect(projected.slice(start, start + literal.length)).toBe(' '.repeat(literal.length));
      expect(projected.slice(start + literal.length)).toBe(raw.slice(start + literal.length));
      expect(projected).not.toMatch(forbidden);
    });
    const mutations: readonly (readonly [string, string, string])[] = [
      ['aliases original props', '{ ...rest }', 'rest'],
      ['unrelated clone', '{ ...rest }', '{}'],
      ['call in clone', '{ ...rest }', '{ ...read(rest) }'],
      ['mutable declaration', 'const native', 'let native'],
      ['additional clone declaration', 'const native = { ...rest };', 'const native = { ...rest }, side = 1;'],
      ['missing deletion', 'delete native[key];', 'native[key];'],
      ['wrong deletion target', 'delete native[key];', 'delete rest[key];'],
      ['wrong deletion key', 'delete native[key];', 'delete native.other;'],
      ['extra loop use', 'delete native[key];', '{ delete native[key]; read(native); }'],
      ['statement separates clone and deletion', '; for', '; read(native); for'],
      ['reordered deny list', "'children', 'dangerouslySetInnerHTML'", "'dangerouslySetInnerHTML', 'children'"],
      ['missing deny list element', ", 'aria-busy'", ''],
      ['extra deny list element', "'aria-busy'", "'aria-busy', 'extra'"],
      ['duplicate deny list element', "'aria-busy'", "'aria-busy', 'dangerouslySetInnerHTML'"],
      ['computed deny list element', "'children'", "('children')"],
      ['unfiltered root spread', '...native, children', '...rest, children'],
      ['additional root spread', '...native, children', '...native, ...rest, children'],
      ['returned raw props', 'return _jsxs("section", { ...native, children: [] });', 'return rest;'],
      ['root spread is not first', '...native, children: []', 'id: "wrong-order", ...native, children: []'],
      ['extra native access', 'return _jsxs', 'read(native); return _jsxs'],
      ['duplicate clone', 'const native = { ...rest };', 'const native = { ...rest }; const native = { ...rest };'],
      ['duplicate deletion loop', 'delete native[key];', "delete native[key]; for (const key of ['children', 'dangerouslySetInnerHTML']) delete native[key];"],
      ['wrong root tag', '_jsxs("section"', '_jsxs("div"'],
      ['different render helper', '_jsxs("section"', '_jsx("section"'],
      ['alias after sanitizer', 'return _jsxs', 'const other = native; return _jsxs'],
      ['reassignment after sanitizer', 'return _jsxs', 'native = rest; return _jsxs'],
      ['reintroduction after sanitizer', 'return _jsxs', 'Object.assign(native, rest); return _jsxs'],
      ['conditional return bypass', 'return _jsxs', 'if (false) return rest; return _jsxs'],
      ['different rest binding', '...rest }', '...other }'],
      ['different parameter field', 'className', 'otherClass'],
      ['default rest binding', '...rest }', '...rest = {} }'],
      ['async owner', 'function ', 'async function '],
      ['generator owner', 'function ', 'function* '],
      ['renamed owner', defense.name, defense.name + 'Other'],
      ['duplicate owner', 'APPEND', sample(defense)],
      ['malformed syntax', 'APPEND', 'function {'],
      ['raw HTML JSX property', 'APPEND', "_jsx('section', {dangerouslySetInnerHTML: {__html: html}});"],
      ['raw HTML assignment', 'APPEND', 'node.dangerouslySetInnerHTML = html;'],
      ['raw HTML access', 'APPEND', 'read(rest.dangerouslySetInnerHTML);'],
      ['raw HTML computed access', 'APPEND', "read(rest['dangerouslySetInnerHTML']);"],
      ['eval operation', 'APPEND', "eval('0');"],
      ['Function operation', 'APPEND', "new Function('return 0');"],
      ['script creation', 'APPEND', "document.createElement('script');"],
      ['style creation', 'APPEND', "document.createElement('style');"],
    ];
    it.each(mutations)(defense.name + ' fails closed for %s', (_name, before, after) => {
      const original = sample(defense);
      const mutated = before === 'APPEND' ? original + '\n' + after : original.replace(before, after);
      expect(mutated).not.toBe(original);
      expect(projectDefensiveNativeProp(mutated, defense.file)).toMatch(forbidden);
    });
    it.each(["eval('0');", "new Function('return 0');", "document.createElement('script');", "document.createElement('style');"])(defense.name + ' preserves standalone forbidden operation %s', code => {
      expect(projectDefensiveNativeProp(code, defense.file)).toMatch(forbidden);
    });
    it(defense.name + ' rejects a cross-module descriptor', () => {
      const other = INLINE_DEFENSES.find(item => item.file !== defense.file)!;
      expect(projectDefensiveNativeProp(sample(defense), other.file)).toMatch(forbidden);
    });
    it(defense.name + ' rejects the wrong modifier', () => {
      const original = sample(defense);
      const wrong = defense.modifiers ? original.replace('export ', '') : 'export ' + original;
      expect(projectDefensiveNativeProp(wrong, defense.file)).toMatch(forbidden);
    });
    it(defense.name + ' fails closed in another module', () => {
      expect(projectDefensiveNativeProp(sample(defense), 'components/other/other.js')).toMatch(forbidden);
    });
  }
});

describe('dist import scheduling and cold native purity', () => {
  const deferred = () => {
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  };
  const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
  it('starts four imports, bounds concurrency, waits for each group, and awaits all filenames exactly once', async () => {
    const items = [0, 1, 2, 3, 4, 5], gates = items.map(deferred), visited: number[] = [];
    let active = 0, peak = 0, completed = false;
    const run = importModuleGroups(items, async item => {
      visited.push(item); active++; peak = Math.max(peak, active);
      await gates[item]!.promise; active--;
    });
    void run.then(() => { completed = true; });
    try {
      await flush();
      expect(visited).toEqual([0, 1, 2, 3]);
      expect(peak).toBe(4);
      gates[0]!.resolve(); gates[1]!.resolve(); gates[2]!.resolve(); await flush();
      expect(visited).toEqual([0, 1, 2, 3]);
      expect(completed).toBe(false);
      gates[3]!.resolve(); await flush();
      expect(visited).toEqual(items);
      expect(active).toBe(2);
      gates[4]!.resolve(); await flush();
      expect(completed).toBe(false);
      gates[5]!.resolve(); await run;
      expect(completed).toBe(true);
      expect(peak).toBe(4);
      expect(active).toBe(0);
      expect(new Set(visited).size).toBe(items.length);
    } finally { for (const gate of gates) gate.resolve(); await run; }
  });
  it('drains a started group before rethrowing a late named rejection and does not start another group', async () => {
    const items = [0, 1, 2, 3, 4, 5], gates = items.map(deferred), visited: number[] = [], failure = new Error('late-module.js');
    let settled = false;
    const run = importModuleGroups(items, async item => { visited.push(item); await gates[item]!.promise; });
    void run.then(() => { settled = true; }, () => { settled = true; });
    try {
      await flush(); expect(visited).toEqual([0, 1, 2, 3]);
      gates[1]!.reject(failure); await flush();
      expect(settled).toBe(false);
      expect(visited).toEqual([0, 1, 2, 3]);
      gates[0]!.resolve(); gates[2]!.resolve(); await flush(); expect(settled).toBe(false);
      gates[3]!.resolve();
      await expect(run).rejects.toBe(failure);
      expect(visited).toEqual([0, 1, 2, 3]);
    } finally { for (const gate of gates) gate.resolve(); await run.catch(() => undefined); }
  });
  it('contains a synchronous named failure while draining the other started imports', async () => {
    const items = [0, 1, 2, 3, 4], gates = items.map(deferred), visited: number[] = [], failure = new Error('sync-module.js');
    let settled = false;
    const run = importModuleGroups(items, item => { visited.push(item); if (item === 1) throw failure; return gates[item]!.promise; });
    void run.then(() => { settled = true; }, () => { settled = true; });
    try {
      await flush(); expect(visited).toEqual([0, 1, 2, 3]);
      expect(settled).toBe(false);
      gates[0]!.resolve(); gates[2]!.resolve(); await flush(); expect(settled).toBe(false);
      gates[3]!.resolve();
      await expect(run).rejects.toBe(failure);
      expect(visited).toEqual([0, 1, 2, 3]);
    } finally { for (const gate of gates) gate.resolve(); await run.catch(() => undefined); }
  });
  it('imports the same sorted inventory serially in a fresh native Node process without DOM globals', async () => {
    const files = checker.listDistModules(DIST);
    expect(await nativeSerialImports(DIST, files)).toEqual(files);
  });
  it('the fresh native witness rejects a module that accesses a DOM global and names that file', async () => {
    const fixture = path.join(ROOT, 'test-results', 'dist-native-import');
    mkdirSync(fixture, { recursive: true });
    writeFileSync(path.join(fixture, 'empty.mjs'), 'export {};');
    writeFileSync(path.join(fixture, 'bad-dom.mjs'), 'export const value = document.body;');
    writeFileSync(path.join(fixture, 'unvisited.mjs'), 'throw new Error("must not visit after failure");');
    try {
      await expect(nativeSerialImports(fixture, ['empty.mjs', 'bad-dom.mjs', 'unvisited.mjs'])).rejects.toThrow('bad-dom.mjs');
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  });
  it('uses the explicit 32-import bound, drains each group, and retains the complete final short group', async () => {
    const items = Array.from({ length: 35 }, (_, index) => index), gates = items.map(deferred), visited: number[] = [];
    let active = 0, peak = 0, completed = false;
    const run = importModuleGroups(items, async item => { visited.push(item); active++; peak = Math.max(peak, active); await gates[item]!.promise; active--; }, 32);
    void run.then(() => { completed = true; });
    try {
      await flush(); expect(visited).toEqual(items.slice(0, 32)); expect(peak).toBe(32);
      for (const gate of gates.slice(0, 31)) gate.resolve(); await flush();
      expect(visited).toEqual(items.slice(0, 32)); expect(completed).toBe(false);
      gates[31]!.resolve(); await flush(); expect(visited).toEqual(items); expect(active).toBe(3);
      for (const gate of gates.slice(32)) gate.resolve(); await run;
      expect(completed).toBe(true); expect(peak).toBe(32); expect(active).toBe(0); expect(new Set(visited).size).toBe(items.length);
    } finally { for (const gate of gates) gate.resolve(); await run; }
  });
});
