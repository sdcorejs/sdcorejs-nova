import { defineConfig } from 'vite';

// Source maps list every module that ended up in the bundle (read by check-bundle).
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  build: { sourcemap: true, modulePreload: { polyfill: false } },
});
