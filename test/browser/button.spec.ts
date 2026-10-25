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

  // Round 2: the IconButton element is the 44×44 target; its visible surface is 32×32
  // (transparent 6px border + padding-box background), not a pseudo hit area.
  test('coarse IconButton shows a 32px surface inside its 44px box', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'engine does not report (pointer: coarse) for a touch context');
    const surface = await page.getByTestId('icon-1').evaluate((element) => {
      const style = getComputedStyle(element);
      return { border: style.borderTopWidth, clip: style.backgroundClip, width: element.getBoundingClientRect().width - 2 * Number.parseFloat(style.borderLeftWidth) };
    });
    expect(surface).toEqual({ border: '6px', clip: 'padding-box', width: 32 });
  });

  // Forced colors force the transparent ring to a visible color: it is painted as
  // Canvas and the 32px surface keeps a 1px outline instead of a thick black ring.
  test('coarse IconButton in forced colors keeps a 1px surface edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active) and (pointer: coarse)').matches);
    test.skip(!forced, 'engine does not emulate forced-colors with (pointer: coarse)');
    const edge = await page.getByTestId('icon-1').evaluate((element) => {
      const style = getComputedStyle(element);
      const canvas = document.createElement('div');
      canvas.style.backgroundColor = 'Canvas';
      document.body.append(canvas);
      const canvasColor = getComputedStyle(canvas).backgroundColor;
      canvas.remove();
      return { ring: style.borderTopColor === canvasColor, outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}` };
    });
    expect(edge).toEqual({ ring: true, outline: 'solid 1px -7px' });
  });
});

test('fine pointer keeps the compact visual size', async ({ page }) => {
  await open(page);
  const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
  test.skip(!fine, 'engine does not report (pointer: fine)');
  expect((await box(page, 'icon-1')).height).toBeLessThan(44);
});

// v2: fixed heights (sm 28 / md 32), weight 500, one line with ellipsis on desktop.
test('desktop buttons keep fixed heights and a single-line label', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
  test.skip(!fine, 'engine does not report (pointer: fine)');
  expect((await box(page, 'long')).height).toBeCloseTo(32, 0);
  expect((await box(page, 'small')).height).toBeCloseTo(28, 0);
  expect((await box(page, 'icon-1')).width).toBeCloseTo(28, 0);
  const label = await page.getByTestId('long').locator('.nova-button__label').evaluate((element) => {
    const style = getComputedStyle(element);
    return { whiteSpace: style.whiteSpace, textOverflow: style.textOverflow, weight: getComputedStyle(element.parentElement!).fontWeight };
  });
  expect(label).toEqual({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', weight: '500' });
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
