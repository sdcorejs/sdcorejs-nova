// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Checker = {
  checkManifest: (manifest: unknown) => string[];
  checkLockfile: (lockfile: unknown) => string[];
};
const { checkLockfile, checkManifest } = (await import(
  new URL('../../scripts/check-package.mjs', import.meta.url).href
)) as Checker;

type ExportTarget = { types?: string; default?: string } | string;
type Manifest = {
  type?: string;
  exports?: Record<string, ExportTarget>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  sideEffects?: boolean | string[];
};

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as Manifest;
const lockfile = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8')) as unknown;

const JS_SUBPATHS = [
  '.', './theme', './i18n', './types', './button', './avatar', './badge', './card', './link',
  './breadcrumb', './alert', './data-state', './field', './input', './checkbox', './switch', './radio-group',
];
const CSS_SUBPATHS = ['./tokens.css', './styles.css', './styles/*.css'];

const FORBIDDEN = [
  'tailwindcss', 'tailwind-merge', 'antd', '@angular/core', '@radix-ui/react-dialog', 'openai',
  '@openai/apps-sdk-ui', 'lucide-react', '@heroicons/react', 'react-icons', '@tabler/icons-react',
];

const validManifest = (): Manifest => ({
  type: 'module',
  exports: {
    ...Object.fromEntries(JS_SUBPATHS.map((key) => [key, { types: './dist/x.d.ts', default: './dist/x.js' }])),
    ...Object.fromEntries(CSS_SUBPATHS.map((key) => [key, './dist/x.css'])),
  },
  dependencies: { '@base-ui/react': '~1.8.0' },
  peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
  sideEffects: ['**/*.css'],
});

describe('package manifest contract', () => {
  it('declares every P0 subpath with types+default', () => {
    expect(manifest.type).toBe('module');
    const exportsMap = manifest.exports ?? {};
    for (const key of JS_SUBPATHS) {
      const target = exportsMap[key];
      expect(target, key).toBeTypeOf('object');
      const conditions = target as { types?: string; default?: string };
      expect(Object.keys(conditions), key).toEqual(['types', 'default']);
      expect(conditions.types, key).toMatch(/^\.\/dist\/.+\/?index\.d\.ts$|^\.\/dist\/index\.d\.ts$/);
      expect(conditions.default, key).toBe(conditions.types?.replace(/\.d\.ts$/, '.js'));
    }
    for (const key of CSS_SUBPATHS) {
      expect(exportsMap[key], key).toMatch(/^\.\/dist\/.+\.css$/);
    }
    expect(Object.keys(exportsMap)).not.toContain('./providers/nova/portal-scope');
    expect(Object.keys(exportsMap).filter((key) => key.includes('lib'))).toEqual([]);
    expect(checkManifest(manifest)).toEqual([]);
  });

  it('peers react/react-dom ^19.0.0 and only @base-ui/react at runtime', () => {
    expect(manifest.peerDependencies).toEqual({ react: '^19.0.0', 'react-dom': '^19.0.0' });
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(['@base-ui/react']);
    expect(manifest.dependencies?.['@base-ui/react']).toMatch(/^~1\.\d+\.\d+$/);
    expect(checkManifest({ ...validManifest(), dependencies: { '@base-ui/react': '~1.8.0', react: '^19.0.0' } }))
      .toContainEqual(expect.stringContaining('react'));
    expect(checkManifest({ ...validManifest(), peerDependencies: { react: '>=18', 'react-dom': '>=18' } }))
      .toContainEqual(expect.stringContaining('peerDependencies'));
  });

  it('sideEffects whitelists css only', () => {
    expect(manifest.sideEffects).toEqual(['**/*.css']);
    expect(checkManifest({ ...validManifest(), sideEffects: true })).toContainEqual(expect.stringContaining('sideEffects'));
    expect(checkManifest({ ...validManifest(), sideEffects: ['**/*.css', './dist/index.js'] }))
      .toContainEqual(expect.stringContaining('sideEffects'));
  });

  it('accepts the synthetic valid manifest (boundary: nothing flagged)', () => {
    expect(checkManifest(validManifest())).toEqual([]);
  });

  it.each(FORBIDDEN)('rejects %s in manifest dependency fields', (name) => {
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
      const synthetic = validManifest();
      synthetic[field] = { ...(synthetic[field] ?? {}), [name]: '1.0.0' };
      expect(checkManifest(synthetic), `${field}:${name}`).toContainEqual(expect.stringContaining(name));
    }
  });

  it.each(FORBIDDEN)('rejects %s in a lockfile', (name) => {
    const synthetic = { lockfileVersion: 3, packages: { '': {}, [`node_modules/${name}`]: { version: '1.0.0' } } };
    expect(checkLockfile(synthetic)).toContainEqual(expect.stringContaining(name));
    const nested = { lockfileVersion: 3, packages: { '': {}, [`node_modules/vite/node_modules/${name}`]: { version: '1.0.0' } } };
    expect(checkLockfile(nested)).toContainEqual(expect.stringContaining(name));
  });

  it('does not flag allowed look-alike names in a lockfile', () => {
    const synthetic = { lockfileVersion: 3, packages: { '': {}, 'node_modules/@base-ui/react': {}, 'node_modules/antdx-helper': {} } };
    expect(checkLockfile(synthetic)).toEqual([]);
  });

  it('real manifest and lockfile contain no forbidden dependency', () => {
    expect(checkManifest(manifest)).toEqual([]);
    expect(checkLockfile(lockfile)).toEqual([]);
  });
});

// Manifest export shape, optional dependencies and resolved package identity.
describe('manifest hardening: export target shape', () => {
  const withTarget = (key: string, target: unknown) => {
    const synthetic = validManifest() as Record<string, unknown> & { exports: Record<string, unknown> };
    synthetic.exports = { ...synthetic.exports, [key]: target };
    return checkManifest(synthetic).join('\n');
  };

  it.each([
    ['undefined/null targets', { types: undefined, default: null }],
    ['numeric targets', { types: 1, default: 2 }],
    ['targets outside dist', { types: './src/button/index.d.ts', default: './src/button/index.js' }],
    ['wrong extensions', { types: './dist/button/index.ts', default: './dist/button/index.mjs' }],
    ['unpaired declaration and JS', { types: './dist/button/index.d.ts', default: './dist/card/index.js' }],
    ['parent traversal', { types: './dist/../src/index.d.ts', default: './dist/../src/index.js' }],
  ])('rejects %s even with the correct condition keys', (_label, target) => {
    expect(withTarget('./button', target)).toMatch(/exports\["\.\/button"\]/);
  });

  it.each([['./dist/styles.js'], ['./src/styles.css'], [123]])('rejects a CSS export target %j', (target) => {
    expect(withTarget('./styles.css', target)).toMatch(/exports\["\.\/styles\.css"\]/);
  });
});

describe('manifest hardening: optional runtime dependencies', () => {
  it('applies the runtime allowlist to optionalDependencies', () => {
    expect(checkManifest({ ...validManifest(), optionalDependencies: { 'some-extra-runtime': '1.0.0' } }).join('\n'))
      .toMatch(/optionalDependencies: some-extra-runtime/);
  });

  it('accepts an empty optionalDependencies object', () => {
    expect(checkManifest({ ...validManifest(), optionalDependencies: {} })).toEqual([]);
  });
});

describe('manifest/lockfile hardening: aliases and resolved identity', () => {
  it('rejects an npm alias that resolves to a forbidden package in the manifest', () => {
    expect(checkManifest({ ...validManifest(), devDependencies: { 'hidden-icon': 'npm:lucide-react@1.0.0' } }).join('\n'))
      .toMatch(/lucide-react/);
    expect(checkManifest({ ...validManifest(), devDependencies: { 'scoped-alias': 'npm:@radix-ui/react-dialog@1' } }).join('\n'))
      .toMatch(/@radix-ui\/react-dialog/);
  });

  it('rejects a lockfile entry whose resolved package name is forbidden', () => {
    const top = { lockfileVersion: 3, packages: { '': {}, 'node_modules/hidden-icon': { name: 'lucide-react', version: '1.0.0' } } };
    expect(checkLockfile(top).join('\n')).toMatch(/lucide-react/);
    const nested = { lockfileVersion: 3, packages: { '': {}, 'node_modules/a/node_modules/b': { name: 'antd', version: '5.0.0' } } };
    expect(checkLockfile(nested).join('\n')).toMatch(/antd/);
  });

  it('rejects alias specifiers inside lockfile dependency maps', () => {
    const root = { lockfileVersion: 3, packages: { '': { dependencies: { tw: 'npm:tailwindcss@4.0.0' } } } };
    expect(checkLockfile(root).join('\n')).toMatch(/tailwindcss/);
    const nested = { lockfileVersion: 3, packages: { '': {}, 'node_modules/x': { optionalDependencies: { i: 'npm:@heroicons/react@2' } } } };
    expect(checkLockfile(nested).join('\n')).toMatch(/@heroicons\/react/);
  });

  it('keeps allowed aliases (typescript-5.7 → typescript) accepted', () => {
    const lock = { lockfileVersion: 3, packages: { '': { devDependencies: { 'typescript-5.7': 'npm:typescript@5.7.3' } }, 'node_modules/typescript-5.7': { name: 'typescript', version: '5.7.3' } } };
    expect(checkLockfile(lock)).toEqual([]);
  });
});

// separator and alias identity bypasses.
describe('manifest hardening (round 2 R1: backslash separators)', () => {
  const withTarget = (key: string, target: unknown) => {
    const synthetic = validManifest() as Record<string, unknown> & { exports: Record<string, unknown> };
    synthetic.exports = { ...synthetic.exports, [key]: target };
    return checkManifest(synthetic).join('\n');
  };

  it.each([
    ['backslash parent traversal', { types: './dist/..\\node_modules/@base-ui/react/button/index.d.ts', default: './dist/..\\node_modules/@base-ui/react/button/index.js' }],
    ['backslash-only path', { types: './dist\\..\\src\\index.d.ts', default: './dist\\..\\src\\index.js' }],
    ['mixed separators', { types: './dist/button\\..\\..\\src/index.d.ts', default: './dist/button\\..\\..\\src/index.js' }],
    ['backslash without traversal', { types: './dist/button\\index.d.ts', default: './dist/button\\index.js' }],
  ])('rejects a JS export with %s', (_label, target) => {
    expect(withTarget('./button', target)).toMatch(/exports\["\.\/button"\]/);
  });

  it('rejects a CSS export target with backslash traversal', () => {
    expect(withTarget('./styles.css', './dist/..\\node_modules/x/styles.css')).toMatch(/exports\["\.\/styles\.css"\]/);
  });

  it('keeps forward-slash dist targets accepted', () => {
    expect(withTarget('./button', { types: './dist/components/button/index.d.ts', default: './dist/components/button/index.js' })).toBe('');
  });
});

describe('manifest hardening (round 2 R2: runtime alias identity)', () => {
  it.each(['dependencies', 'optionalDependencies'])('rejects an allowed install key aliased to another package in %s', (field) => {
    const synthetic = { ...validManifest(), [field]: { '@base-ui/react': 'npm:some-extra-runtime@1' } };
    expect(checkManifest(synthetic).join('\n')).toMatch(new RegExp(`${field}: @base-ui/react .*some-extra-runtime`));
  });

  it('rejects a disallowed install key even when aliased to an allowed package', () => {
    expect(checkManifest({ ...validManifest(), dependencies: { '@base-ui/react': '~1.8.0', extra: 'npm:@base-ui/react@1.8.0' } }).join('\n'))
      .toMatch(/dependencies: extra/);
  });

  it.each(['file:../evil', 'link:../evil', 'github:evil/runtime', 'git+https://example.com/evil.git', 'https://example.com/evil.tgz', 'workspace:*'])(
    'rejects a runtime specifier %s whose package identity is not the registry package',
    (specifier) => {
      expect(checkManifest({ ...validManifest(), dependencies: { '@base-ui/react': specifier } }).join('\n'))
        .toMatch(/dependencies: @base-ui\/react/);
    },
  );

  it('accepts a runtime alias that resolves to the same allowed package, and the TypeScript dev alias', () => {
    expect(checkManifest({ ...validManifest(), dependencies: { '@base-ui/react': 'npm:@base-ui/react@~1.8.0' } })).toEqual([]);
    expect(checkManifest({ ...validManifest(), devDependencies: { 'typescript-5.7': 'npm:typescript@5.7.3' } })).toEqual([]);
  });

  it('still rejects a forbidden alias outside runtime maps', () => {
    expect(checkManifest({ ...validManifest(), devDependencies: { 'typescript-5.7': 'npm:antd@5' } }).join('\n')).toMatch(/antd/);
  });
});
