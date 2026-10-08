import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
type Violation = { disposition: string; directive: string; blocked: string; sample: string };

let server: ChildProcess | undefined;
let origin = '';

test.beforeAll(async () => {
  server = spawn(process.execPath, [path.join(ROOT, 'fixtures/vite-csr/server.mjs'), '0'], { stdio: ['ignore', 'pipe', 'inherit'] });
  origin = await new Promise<string>((resolve, reject) => {
    server!.stdout!.on('data', (chunk: Buffer) => {
      const match = /LISTENING (\d+)/.exec(String(chunk));
      if (match) resolve(`http://127.0.0.1:${match[1]}`);
    });
    server!.on('exit', (code) => reject(new Error(`fixture server exited ${code}`)));
  });
});

test.afterAll(() => {
  server?.kill();
});

async function open(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: Violation[] = [];
    (window as unknown as { __csp: Violation[] }).__csp = store;
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push({ disposition: event.disposition, directive: event.effectiveDirective, blocked: event.blockedURI, sample: event.sample });
    });
  });
  const response = await page.goto(origin);
  expect(response?.headers()['content-security-policy']).toContain("style-src-attr 'unsafe-inline'");
  expect(response?.headers()['content-security-policy-report-only']).toContain("style-src-attr 'none'");
  await expect(page.getByTestId('nova-app')).toBeVisible();
}

async function exercise(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Chế độ tối' }).click();
  await page.getByRole('checkbox', { name: 'Đồng ý điều khoản' }).click();
  await page.getByRole('radio', { name: 'Một (số)' }).click();
  await page.getByRole('switch', { name: 'Nhận thông báo' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('an@example.com');
  await page.getByRole('button', { name: 'Gửi' }).click();
  await page.getByRole('button', { name: 'Tăng' }).click();
  await page.getByRole('button', { name: 'Đóng thông báo' }).click();
  await page.getByRole('button', { name: 'Chế độ sáng' }).click();
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { __csp: Violation[] }).__csp);

test('CSP-A has 0 securitypolicyviolation (enforced) during real use', async ({ page }) => {
  await open(page);
  await exercise(page);
  await page.waitForTimeout(300);
  expect((await violations(page)).filter((violation) => violation.disposition === 'enforce')).toEqual([]);
});

test('theme switch changes computed background', async ({ page }) => {
  await open(page);
  const card = page.getByTestId('card');
  const before = await card.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Chế độ tối' }).click();
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(before);
  expect(before).toBe('rgb(255, 255, 255)');
  expect(await card.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(17, 17, 19)');
});

test('checkbox and radio produce expected FormData', async ({ page }) => {
  await open(page);
  const output = page.getByTestId('formdata');
  await page.getByRole('button', { name: 'Gửi' }).click();
  await expect(output).toHaveText('[]');
  await page.getByRole('checkbox', { name: 'Đồng ý điều khoản' }).click();
  await page.getByRole('radio', { name: 'Một (số)' }).click();
  await page.getByRole('button', { name: 'Gửi' }).click();
  await expect(output).toHaveText(JSON.stringify([['agree', 'yes'], ['choice', 'n:1']]));
  await page.getByRole('radio', { name: 'Một (chuỗi)' }).click();
  await page.getByRole('button', { name: 'Gửi' }).click();
  await expect(output).toHaveText(JSON.stringify([['agree', 'yes'], ['choice', 's:1']]));
});

test('button and alert callbacks fire once', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Tăng' }).click();
  await expect(page.getByTestId('clicks')).toHaveText('1');
  await page.getByRole('button', { name: 'Đóng thông báo' }).click();
  await expect(page.getByTestId('dismisses')).toHaveText('1');
});

test('axe has no violations (light and dark)', async ({ page }) => {
  await open(page);
  const light = await new AxeBuilder({ page }).include('#root').analyze();
  expect(light.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  await page.getByRole('button', { name: 'Chế độ tối' }).click();
  // measure the settled UI: wait for the 150ms colour transitions to finish
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished)));
  const dark = await new AxeBuilder({ page }).include('#root').analyze();
  expect(dark.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

test('CSP-B report-only: Nova elements never carry style attributes; Base UI ones are reported', async ({ page }, testInfo) => {
  await open(page);
  await exercise(page);
  await page.waitForTimeout(300);
  const report = (await violations(page)).filter((violation) => violation.disposition === 'report');
  const styled = await page.evaluate(() => [...document.querySelectorAll('#root [style]')].map((element) => ({
    tag: element.tagName.toLowerCase(),
    novaClass: [...element.classList].some((name) => name.startsWith('nova-')),
    hiddenInput: element.tagName === 'INPUT' && element.getAttribute('aria-hidden') === 'true',
  })));
  expect(styled.filter((element) => element.novaClass)).toEqual([]);
  expect(styled.every((element) => element.hiddenInput)).toBe(true);
  const directory = path.join(ROOT, 'test-results', 'csp-b');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `vite-${testInfo.project.name}.json`), JSON.stringify({ report, styled }, null, 2));
  expect(report.every((violation) => violation.directive === 'style-src-attr')).toBe(true);
});
