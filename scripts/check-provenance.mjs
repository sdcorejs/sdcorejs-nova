// Provenance/notice checker (D-002, R-001): every file copied or adapted from an
// upstream (shadcn/ui, Base UI, …) carries `@nova-provenance: <id>`, has a complete
// entry in third_party/provenance.json (repository, pinned commit, file, license,
// import date, local diff) and a notice in THIRD_PARTY_NOTICES.md; every runtime
// dependency has a notice too. CLI: `node scripts/check-provenance.mjs`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const MARKER = /@nova-provenance:\s*([\w.-]+)/u;
const ADAPTED = /\b(?:copied|adapted|ported)\s+from\b/iu;
const COMMIT = /^[0-9a-f]{40}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

function hasNotice(notices, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/gu, '\\$&');
  return new RegExp(`^##\\s+${escaped}\\b`, 'mu').test(notices);
}

export function checkProvenance({ files, provenance, notices, runtimeDependencies }) {
  const errors = [];
  const entries = new Map((provenance?.copied ?? []).map((entry) => [entry.id, entry]));
  const byPath = new Map(files.map((file) => [file.path, file.content]));

  for (const file of files) {
    const marker = MARKER.exec(file.content);
    if (marker) {
      const entry = entries.get(marker[1]);
      if (!entry) errors.push(`${file.path}: marker ${marker[1]} has no provenance entry`);
      else if (entry.path !== file.path) errors.push(`${file.path}: provenance entry ${marker[1]} points to ${entry.path}`);
    } else if (ADAPTED.test(file.content)) {
      errors.push(`${file.path}: says it was copied/adapted but has no @nova-provenance marker`);
    }
  }

  for (const entry of entries.values()) {
    const label = `provenance ${entry.id}`;
    const content = byPath.get(entry.path);
    if (content === undefined) errors.push(`${label}: file ${entry.path} does not exist`);
    else if (MARKER.exec(content)?.[1] !== entry.id) errors.push(`${label}: ${entry.path} lacks "@nova-provenance: ${entry.id}"`);
    const upstream = entry.upstream ?? {};
    if (!/^https:\/\//u.test(upstream.repository ?? '')) errors.push(`${label}: upstream repository must be an https URL`);
    if (!COMMIT.test(upstream.commit ?? '')) errors.push(`${label}: upstream commit must be a pinned 40-character SHA`);
    if (!upstream.file) errors.push(`${label}: upstream file is missing`);
    if (!upstream.license) errors.push(`${label}: upstream license is missing`);
    if (!DATE.test(entry.importedAt ?? '')) errors.push(`${label}: importedAt must be YYYY-MM-DD`);
    if (!entry.localDiff?.trim()) errors.push(`${label}: localDiff must describe the local changes`);
    if (upstream.name && !hasNotice(notices, upstream.name)) errors.push(`${label}: THIRD_PARTY_NOTICES.md has no notice for ${upstream.name}`);
  }

  for (const dependency of runtimeDependencies) {
    if (!hasNotice(notices, dependency)) errors.push(`THIRD_PARTY_NOTICES.md has no notice for runtime dependency ${dependency}`);
  }
  return errors;
}

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(?:ts|tsx|css)$/u.test(name) && !/\.test\.tsx?$/u.test(name)) out.push(full);
  }
  return out;
}

export function loadRepositoryInput() {
  const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');
  const manifest = JSON.parse(read('package.json'));
  return {
    files: sourceFiles(path.join(ROOT, 'src')).map((file) => ({
      path: path.relative(ROOT, file).replaceAll('\\', '/'),
      content: readFileSync(file, 'utf8'),
    })),
    provenance: existsSync(path.join(ROOT, 'third_party', 'provenance.json')) ? JSON.parse(read('third_party/provenance.json')) : { copied: [] },
    notices: existsSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md')) ? read('THIRD_PARTY_NOTICES.md') : '',
    runtimeDependencies: Object.keys(manifest.dependencies ?? {}).sort(),
  };
}

const isCli = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isCli) {
  const input = loadRepositoryInput();
  const errors = checkProvenance(input);
  for (const error of errors) console.error(`check-provenance: ${error}`);
  if (errors.length) process.exit(1);
  console.log(`check-provenance: OK — ${input.files.length} source files, ${input.provenance.copied.length} copied, notices for ${input.runtimeDependencies.join(', ')}`);
}
