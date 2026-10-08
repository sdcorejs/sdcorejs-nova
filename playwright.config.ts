import { defineConfig, devices } from '@playwright/test';

// Browser harness (evidence class B): real engines against the source harness
// served by Vite. Production tarball fixtures use test/e2e/playwright.config.ts.
const PORT = 5179;

export default defineConfig({
  testDir: 'test/browser',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `npx --no-install vite --config test/browser/harness/vite.config.ts --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
