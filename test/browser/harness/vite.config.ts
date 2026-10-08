import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

// Source harness: serves test/browser/scenarios/*.tsx against src/** and the
// compiled CSS in dist/ (tokens + fallbacks only exist after build-css).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  oxc: { jsx: { runtime: 'automatic' } },
  server: { fs: { allow: [repoRoot] } },
  // Pre-scan every scenario so dependency optimization never re-runs mid-session
  // (a re-run can load a second React copy and break hooks).
  optimizeDeps: { entries: ['main.tsx', '../scenarios/*.tsx'] },
  clearScreen: false,
});
