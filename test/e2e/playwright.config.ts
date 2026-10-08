import { defineConfig, devices } from '@playwright/test';

// Production tarball fixtures (evidence class E). Each spec starts its own
// fixture server (free port) so Vite and Next specs never depend on each other.
// Run `npm run smoke:pack` first: it packs the tarball and builds the fixtures.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
