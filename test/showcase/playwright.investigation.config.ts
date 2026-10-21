// INVESTIGATION ONLY (never merge): Chromium-only runner for the focus trace.
import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const port=process.env.NOVA_SHOWCASE_TEST_PORT??'5203';
export default defineConfig({
  testDir:'.',testMatch:['focus-investigation.spec.ts','showcase.spec.ts'],fullyParallel:false,workers:1,retries:0,timeout:30000,globalTimeout:1500000,
  outputDir:'../../test-results/investigation',reporter:[['list']],
  use:{baseURL:`http://127.0.0.1:${port}/sdcorejs-nova/`,trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{cwd:fileURLToPath(new URL('../../',import.meta.url)),command:`node node_modules/vite/bin/vite.js preview --config showcase/vite.config.mjs --port ${port}`,url:`http://127.0.0.1:${port}/sdcorejs-nova/`,reuseExistingServer:false,timeout:30000},
});
