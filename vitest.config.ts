import { defineConfig } from 'vitest/config';

// Two projects only: `unit` (jsdom; package/script checks opt into node per file
// with `// @vitest-environment node`) and `ssr` (node, no DOM globals).
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'test/package/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['test/ssr/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
