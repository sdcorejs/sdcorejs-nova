import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Browser, type Page } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = path.join(ROOT, 'fixtures', 'next-ssr');
type Violation = { disposition: string; directive: string; blocked: string; sample: string };

let server: ChildProcess | undefined;
let origin = '';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

test.beforeAll(async () => {
  const port = await freePort();
  server = spawn(process.execPath, [path.join(FIXTURE, 'run-next.mjs'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: FIXTURE, stdio: 'ignore' });
  origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('next start did not become ready');
});

test.afterAll(() => {
  server?.kill();
});

async function watch(page: Page): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  page.on('console', (message) => {
    // Firefox/WebKit log CSP-B (report-only) reports as console errors; they are
    // measured by the CSP-B test, not counted as application/hydration errors.
    if (message.type() === 'error' && !/report[\s-]only/i.test(message.text())) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    const store: Violation[] = [];
    (window as unknown as { __csp: Violation[] }).__csp = store;
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push({ disposition: event.disposition, directive: event.effectiveDirective, blocked: event.blockedURI, sample: event.sample });
    });
  });
  return { errors };
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp: Violation[] }).__csp);

test('next start pages hydrate with 0 recoverable errors and 0 console errors', async ({ page }) => {
  const { errors } = await watch(page);
  await page.goto(origin);
  await expect(page.getByTestId('hydrated')).toHaveAttribute('data-hydrated', 'true');
  await page.getByRole('button', { name: 'Tăng' }).click();
  await expect(page.getByTestId('clicks')).toHaveText('1');
  await page.getByRole('checkbox', { name: 'Đồng ý' }).click();
  await expect(page.getByRole('checkbox', { name: 'Đồng ý' })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('server-compatible components render in a Server Component without client boundary', async ({ browser }) => {
  const manifestDir = path.join(FIXTURE, '.next', 'server', 'app');
  const manifests = existsSync(manifestDir) ? readdirSync(manifestDir).filter((file) => file.includes('client-reference-manifest')) : [];
  expect(manifests.length).toBeGreaterThan(0);
  const manifest = manifests.map((file) => readFileSync(path.join(manifestDir, file), 'utf8')).join('\n').replaceAll('\\\\', '/');
  for (const client of ['components/button/button.js', 'components/checkbox/checkbox.js', 'providers/nova/nova-provider.js']) {
    expect(manifest, client).toContain(client);
  }
  for (const server of ['components/badge/badge.js', 'components/card/card.js', 'components/card/section.js', 'components/link/link.js', 'components/data-state/empty.js', 'components/data-state/skeleton.js']) {
    expect(manifest, server).not.toContain(server);
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(origin);
  await expect(page.getByTestId('server-badge')).toHaveText('0');
  await expect(page.getByRole('heading', { name: 'Hồ sơ máy chủ' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trang ngoài' })).toHaveAttribute('rel', 'noopener noreferrer');
  await context.close();
});

test('CSP-A with per-request nonce has 0 violations', async ({ page, request }) => {
  const first = await request.get(origin);
  const second = await request.get(origin);
  const nonceOf = (header: string | undefined) => /'nonce-([^']+)'/.exec(header ?? '')?.[1];
  const nonceA = nonceOf(first.headers()['content-security-policy']);
  const nonceB = nonceOf(second.headers()['content-security-policy']);
  expect(nonceA).toBeTruthy();
  expect(nonceA).not.toBe(nonceB);
  const html = await first.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) expect(script).toContain(`nonce="${nonceA}"`);
  expect(html).not.toMatch(/<style(?![^>]*nonce)/);

  await watch(page);
  await page.goto(origin);
  await expect(page.getByTestId('hydrated')).toHaveAttribute('data-hydrated', 'true');
  await page.getByRole('button', { name: 'Tăng' }).click();
  await page.getByRole('radio', { name: 'Hai' }).click();
  await page.waitForTimeout(300);
  expect((await violations(page)).filter((violation) => violation.disposition === 'enforce')).toEqual([]);
});

async function firstPaintBackground(browser: Browser, colorScheme: 'light' | 'dark'): Promise<{ background: string; theme: string | null }> {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme });
  const page = await context.newPage();
  await page.goto(origin);
  const card = page.getByTestId('server-card');
  const result = {
    background: await card.evaluate((element) => getComputedStyle(element).backgroundColor),
    theme: await page.locator('.nova-theme').first().getAttribute('data-nova-theme'),
  };
  await context.close();
  return result;
}

test('system theme first paint uses media query without markup change', async ({ browser, page }) => {
  expect(await firstPaintBackground(browser, 'dark')).toEqual({ background: 'rgb(17, 17, 19)', theme: 'system' });
  expect(await firstPaintBackground(browser, 'light')).toEqual({ background: 'rgb(255, 255, 255)', theme: 'system' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(origin);
  await expect(page.getByTestId('hydrated')).toHaveAttribute('data-hydrated', 'true');
  expect(await page.locator('.nova-theme').first().getAttribute('data-nova-theme')).toBe('system');
  await expect(page.getByTestId('resolved-theme')).toHaveText('dark');
});

test('CSP-B report-only: only Base UI hidden-input style attributes are reported', async ({ page }, testInfo) => {
  await watch(page);
  await page.goto(origin);
  await expect(page.getByTestId('hydrated')).toHaveAttribute('data-hydrated', 'true');
  await page.waitForTimeout(300);
  const report = (await violations(page)).filter((violation) => violation.disposition === 'report');
  const styled = await page.evaluate(() => [...document.querySelectorAll('.nova-theme [style]')].map((element) => ({
    tag: element.tagName.toLowerCase(),
    novaClass: [...element.classList].some((name) => name.startsWith('nova-')),
    hiddenInput: element.tagName === 'INPUT' && element.getAttribute('aria-hidden') === 'true',
  })));
  expect(styled.filter((element) => element.novaClass)).toEqual([]);
  expect(styled.every((element) => element.hiddenInput)).toBe(true);
  expect(report.every((violation) => violation.directive === 'style-src-attr')).toBe(true);
  const directory = path.join(ROOT, 'test-results', 'csp-b');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `next-${testInfo.project.name}.json`), JSON.stringify({ report, styled }, null, 2));
});
