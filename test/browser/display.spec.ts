import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { colorTokens, contrastRatio } from '../../src/tokens/tokens.js';

const TONES = ['neutral', 'success', 'warning', 'error', 'info'] as const;

function hex(rgb: string): string {
  const parts = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((part) => Math.round(Number(part)));
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=display');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('outside-card')).toHaveCount(1);
}

const styleOf = (page: Page, testId: string, property: string) =>
  page.getByTestId(testId).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

test('outside provider computed colors equal light fallbacks', async ({ page }) => {
  await open(page);
  expect(hex(await styleOf(page, 'outside-card', 'background-color'))).toBe(colorTokens.light.background);
  expect(hex(await styleOf(page, 'outside-card', 'color'))).toBe(colorTokens.light.text);
  expect(hex(await styleOf(page, 'outside-badge-success', 'color'))).toBe(colorTokens.light['success-text']);
  expect(hex(await styleOf(page, 'outside-badge-success', 'background-color'))).toBe(colorTokens.light['success-surface']);
  expect(hex(await styleOf(page, 'dark-card', 'background-color'))).toBe(colorTokens.dark.background);
});

test('ancestor --nova-* is inherited outside provider', async ({ page }) => {
  await open(page);
  await page.getByTestId('ancestor').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--nova-color-background', 'rgb(1, 2, 3)');
  });
  expect(await styleOf(page, 'ancestor-card', 'background-color')).toBe('rgb(1, 2, 3)');
  expect(hex(await styleOf(page, 'outside-card', 'background-color'))).toBe(colorTokens.light.background);
});

test('320px title and actions do not overlap; long badge wraps without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1200 });
  await open(page);
  for (const prefix of ['outside', 'light', 'dark']) {
    const title = (await page.getByTestId(`${prefix}-title`).boundingBox())!;
    const actions = (await page.getByTestId(`${prefix}-actions`).boundingBox())!;
    const separate = actions.y >= title.y + title.height - 0.5 || actions.x >= title.x + title.width - 0.5
      || title.x >= actions.x + actions.width - 0.5;
    expect(separate, prefix).toBe(true);
    const badge = (await page.getByTestId(`${prefix}-badge-success`).boundingBox())!;
    expect(badge.x + badge.width, prefix).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('Tab visits only interactive children', async ({ page }) => {
  await open(page);
  // WebKit leaves links out of the Tab order by default and Firefox wraps around, so walk
  // until focus leaves #root or returns to an element already visited.
  const buttons = await page.locator('#root button').count();
  await page.locator('#root button').first().focus();
  const visited: string[] = [];
  for (let step = 0; step < 50; step += 1) {
    const tag = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !document.getElementById('root')?.contains(active) || active.dataset.visited) return null;
      active.dataset.visited = '1';
      return active.tagName;
    });
    if (tag === null) break;
    visited.push(tag);
    await page.keyboard.press('Tab');
  }
  expect(visited.filter((tag) => tag === 'BUTTON')).toHaveLength(buttons);
  expect(visited.every((tag) => tag === 'BUTTON' || tag === 'A')).toBe(true);
});

test('tone contrast computed light/dark', async ({ page }) => {
  await open(page);
  for (const scope of ['light', 'dark']) {
    for (const tone of TONES) {
      const id = `${scope}-badge-${tone}`;
      const ratio = contrastRatio(hex(await styleOf(page, id, 'color')), hex(await styleOf(page, id, 'background-color')));
      expect(ratio, id).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('display scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

// supported consumer surfaces and the indeterminate indicator.
import { inflateSync } from 'node:zlib';

const TEXT_PARTS: [string, string][] = [
  ['title', ''], ['desc', ''], ['body', ''], ['error', '.nova-data-state__message'], ['spinner', '.nova-spinner__label'],
  ['progress', '.nova-progress__label'], ['progress', '.nova-progress__value'], ['breadcrumb', 'a'],
  ['breadcrumb', '.nova-breadcrumb__current'], ['link', ''],
];

/** Text colour against the first painted ancestor background (the page is white). */
async function textContrast(page: Page, testId: string, inner: string): Promise<number> {
  const base = page.getByTestId(testId);
  const target = inner ? base.locator(inner).first() : base;
  const [fg, bg] = await target.evaluate((element) => {
    const color = getComputedStyle(element).color;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(background)) return [color, background];
    }
    return [color, 'rgb(255, 255, 255)'];
  });
  return contrastRatio(hex(fg!), hex(bg!));
}

test('supported: Nova text on a consumer surface inside every scope, island and portal is ≥ 4.5:1', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('portal-surface')).toHaveCount(1);
  for (const prefix of ['surface-light', 'surface-dark', 'island-light', 'portal-dark']) {
    for (const [part, inner] of TEXT_PARTS) {
      expect(await textContrast(page, `${prefix}-${part}`, inner), `${prefix}-${part} ${inner}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('unsupported-integration evidence: without a consumer surface the theme text sits on the host colour', async ({ page }) => {
  await open(page);
  expect(await textContrast(page, 'bare-dark-title', '')).toBeLessThan(4.5);
  expect(await textContrast(page, 'island-bare-title', '')).toBeLessThan(4.5);
});

test('supported surfaces have no axe violations', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('portal-surface')).toHaveCount(1);
  const result = await new AxeBuilder({ page })
    .include('[data-region="surface-light"]').include('[data-region="surface-dark"]')
    .include('[data-samples="island-light"]').include('[data-testid="portal-surface"]')
    .analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

/** Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) for pixel checks. */
function decodePng(buffer: Buffer): { width: number; height: number; pixel: (x: number, y: number) => number[] } {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 4;
  const data: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      channels = body[9] === 2 ? 3 : 4;
    } else if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[y * (stride + 1) + 1 + x]!;
      const left = x >= channels ? out[y * stride + x - channels]! : 0;
      const up = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels]! : 0;
      const p = left + up - upLeft;
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft)
        ? left
        : Math.abs(p - up) <= Math.abs(p - upLeft) ? up : upLeft;
      const predictor = [0, left, up, (left + up) >> 1, paeth][filter]!;
      out[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return { width, height, pixel: (x, y) => [...out.subarray(y * stride + x * channels, y * stride + x * channels + 3)] };
}

/** Share of inner pixels (border excluded) clearly darker/lighter than the page surface. */
async function indicatorShare(page: Page, testId: string): Promise<number> {
  const bar = page.getByTestId(testId).locator('.nova-progress__bar');
  const surface = await bar.evaluate((element) => {
    const [r, g, b] = getComputedStyle(element.closest('.consumer-surface')!).backgroundColor.match(/\d+/g)!.map(Number);
    return (r! + g! + b!) / 3;
  });
  const png = decodePng(await bar.screenshot({ animations: 'disabled' }));
  let differing = 0;
  let total = 0;
  for (let y = 2; y < png.height - 2; y += 1) {
    for (let x = 3; x < png.width - 3; x += 1) {
      total += 1;
      const [r, g, b] = png.pixel(x, y);
      if (Math.abs((r! + g! + b!) / 3 - surface) > 60) differing += 1;
    }
  }
  return total ? differing / total : 0;
}

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`indeterminate Progress indicator is visible (${motion} motion)`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await open(page);
    expect(await indicatorShare(page, 'surface-light-progress'), 'determinate control').toBeGreaterThan(0.2);
    expect(await indicatorShare(page, 'surface-light-indeterminate'), 'indeterminate').toBeGreaterThan(0.2);
    if (motion === 'reduce') {
      const animation = await page.getByTestId('surface-light-indeterminate').locator('.nova-progress__bar').evaluate((element) => getComputedStyle(element).animationName);
      expect(animation).toBe('none');
    }
  });
}
