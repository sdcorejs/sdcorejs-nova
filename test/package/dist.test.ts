// @vitest-environment node
// Dist contract (INV-002, INV-004, INV-011, INV-014). Runs on the tsc/CSS build
// output: `npm run build` must run first (see `npm run test:unit -- test/package/dist.test.ts`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

type CheckDist = {
  checkDist: (root: string) => string[];
  listDistModules: (distDir: string) => string[];
  readDirective: (code: string) => string | null;
  relativeImports: (code: string) => string[];
};

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
const jsSubpaths = Object.entries(manifest.exports).filter(([key, target]) => key !== '.' && typeof target === 'object');

function typeExports(file: string): string[] {
  const program = ts.createProgram([file], { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, noEmit: true, skipLibCheck: true });
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
    for (const file of checker.listDistModules(DIST)) {
      await expect(import(pathToFileURL(path.join(DIST, file)).href), file).resolves.toBeTruthy();
    }
  });

  it('no test files, no raw HTML or code evaluation in dist (INV-010, INV-014)', () => {
    for (const file of checker.listDistModules(DIST)) {
      expect(file).not.toMatch(/\.test\./);
      const code = read(file);
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
