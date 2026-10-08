import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=button');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('long')).toHaveCount(1);
}

async function box(page: Page, testId: string): Promise<Box> {
  const result = await page.getByTestId(testId).boundingBox();
  if (!result) throw new Error(`${testId} has no box`);
  return result;
}

test('long label wraps at 320px without covering sibling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  const long = await box(page, 'long');
  const sibling = await box(page, 'sibling');
  expect(long.width).toBeLessThanOrEqual(320);
  expect(long.height).toBeGreaterThan(40);
  expect(overlaps(long, sibling)).toBe(false);
  const fits = await page.getByTestId('long').evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
  expect(fits).toBe(true);
});

test.describe('coarse pointer', () => {
  test.use({ hasTouch: true });

  test('coarse pointer 44×44 without overlap inside ButtonGroup', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'engine does not report (pointer: coarse) for a touch context');
    const ids = ['icon-1', 'icon-2', 'small'];
    const boxes = await Promise.all(ids.map((id) => box(page, id)));
    for (const [index, item] of boxes.entries()) {
      expect(item.width, ids[index]).toBeGreaterThanOrEqual(44);
      expect(item.height, ids[index]).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) expect(overlaps(boxes[i]!, boxes[j]!), `${ids[i]}/${ids[j]}`).toBe(false);
    }
  });
});

test('fine pointer keeps the compact visual size', async ({ page }) => {
  await open(page);
  const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
  test.skip(!fine, 'engine does not report (pointer: fine)');
  expect((await box(page, 'icon-1')).height).toBeLessThan(44);
});

test('button scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

// loading keeps the box and the visible label.
test('loading keeps the button and icon-button geometry, label stays visible', async ({ page }) => {
  await open(page);
  for (const [idle, loading] of [['save-idle', 'save-loading'], ['icon-idle', 'icon-loading']] as const) {
    const a = await box(page, idle);
    const b = await box(page, loading);
    expect(Math.abs(a.width - b.width), `${loading} width`).toBeLessThan(0.5);
    expect(Math.abs(a.height - b.height), `${loading} height`).toBeLessThan(0.5);
  }
  const label = page.getByTestId('save-loading').locator('.nova-button__label');
  await expect(label).toBeVisible();
  expect(await label.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await label.evaluate((element) => getComputedStyle(element).visibility)).toBe('visible');
});
