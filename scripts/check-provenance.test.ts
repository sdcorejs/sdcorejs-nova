// @vitest-environment node
import { describe, expect, it } from 'vitest';

type Entry = {
  id: string;
  path: string;
  upstream: { name: string; repository: string; commit: string; file: string; license: string };
  importedAt: string;
  localDiff: string;
};
type Input = {
  files: { path: string; content: string }[];
  provenance: { copied: Entry[] };
  notices: string;
  runtimeDependencies: string[];
};
type Checker = {
  checkProvenance: (input: Input) => string[];
  loadRepositoryInput: () => Input;
};

const { checkProvenance, loadRepositoryInput } = (await import(new URL('./check-provenance.mjs', import.meta.url).href)) as Checker;

const entry = (): Entry => ({
  id: 'shadcn-button',
  path: 'src/components/button/button.tsx',
  upstream: {
    name: 'shadcn/ui',
    repository: 'https://github.com/shadcn-ui/ui',
    commit: '0123456789abcdef0123456789abcdef01234567',
    file: 'apps/v4/registry/new-york-v4/ui/button.tsx',
    license: 'MIT',
  },
  importedAt: '2026-10-08',
  localDiff: 'Tailwind classes replaced by .nova-* CSS; React 19 ref prop.',
});

const valid = (): Input => ({
  files: [
    { path: 'src/components/button/button.tsx', content: '// @nova-provenance: shadcn-button\nexport const x = 1;' },
    { path: 'src/components/badge/badge.tsx', content: 'export const y = 2;' },
  ],
  provenance: { copied: [entry()] },
  notices: '# Notices\n\n## shadcn/ui (MIT)\n\nCopyright (c) 2023 shadcn\n\n## @base-ui/react (MIT)\n\nCopyright (c) 2019 Material-UI SAS\n',
  runtimeDependencies: ['@base-ui/react'],
});

const errors = (input: Input) => checkProvenance(input).join('\n');

describe('checkProvenance', () => {
  it('accepts a copied file with a complete entry and its notice', () => {
    expect(checkProvenance(valid())).toEqual([]);
  });

  it('checker fails when a copied file lacks provenance entry', () => {
    const input = valid();
    input.provenance.copied = [];
    expect(errors(input)).toMatch(/src\/components\/button\/button\.tsx/);
  });

  it('checker fails when a copied file lacks its notice', () => {
    const input = valid();
    input.notices = '# Notices\n\n## @base-ui/react (MIT)\n';
    expect(errors(input)).toMatch(/notice/i);
  });

  it('flags an adapted file that carries no provenance marker', () => {
    const input = valid();
    input.files.push({ path: 'src/components/alert/alert.tsx', content: '// Adapted from shadcn/ui alert\nexport {};' });
    expect(errors(input)).toMatch(/src\/components\/alert\/alert\.tsx/);
  });

  it('requires a pinned commit, import date and local diff', () => {
    const input = valid();
    input.provenance.copied = [{ ...entry(), upstream: { ...entry().upstream, commit: 'main' }, importedAt: 'yesterday', localDiff: '' }];
    const text = errors(input);
    expect(text).toMatch(/commit/);
    expect(text).toMatch(/importedAt/);
    expect(text).toMatch(/localDiff/);
  });

  it('rejects an entry whose file is missing or unmarked', () => {
    const input = valid();
    input.provenance.copied.push({ ...entry(), id: 'ghost', path: 'src/components/ghost.tsx' });
    input.files[1] = { path: 'src/components/badge/badge.tsx', content: 'export const y = 2;' };
    input.provenance.copied.push({ ...entry(), id: 'unmarked', path: 'src/components/badge/badge.tsx' });
    const text = errors(input);
    expect(text).toMatch(/ghost/);
    expect(text).toMatch(/unmarked/);
  });

  it('requires a notice for every runtime dependency', () => {
    const input = valid();
    input.notices = '# Notices\n\n## shadcn/ui (MIT)\n';
    expect(errors(input)).toMatch(/@base-ui\/react/);
  });

  it('the repository itself passes (manifest, notices, provenance and src)', () => {
    const input = loadRepositoryInput();
    expect(input.runtimeDependencies).toEqual(['@base-ui/react']);
    expect(input.files.length).toBeGreaterThan(30);
    expect(checkProvenance(input)).toEqual([]);
  });
});
