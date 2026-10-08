import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const port=process.env.NOVA_SHOWCASE_TEST_PORT??'5203';
export default defineConfig({
  testDir:'.',testMatch:'showcase.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:20000,globalTimeout:180000,
  outputDir:'../../test-results/showcase',
  use:{baseURL:`http://127.0.0.1:${port}/sdcorejs-nova/`,trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'firefox',use:{...devices['Desktop Firefox']}},{name:'webkit',use:{...devices['Desktop Safari']}}],
  webServer:{cwd:fileURLToPath(new URL('../../',import.meta.url)),command:`node node_modules/vite/bin/vite.js preview --config showcase/vite.config.mjs --port ${port}`,url:`http://127.0.0.1:${port}/sdcorejs-nova/`,reuseExistingServer:false,timeout:30000},
});
