import { defineConfig } from 'vite';

// Production build of the consumer app; the package comes from the packed
// tarball in node_modules, never from ../../src.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  build: {
    // no inline scripts or data: modules so CSP-A (script-src 'self') applies cleanly
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
  },
});
