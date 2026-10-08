import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };
// boundingBox() may report a CSS 44px box as 43.99999809 (float rounding in Firefox)
const EPSILON = 0.01;
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=toggle');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: 'Email' })).toHaveCount(1);
}

test('forced-colors focus visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);
  const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
  test.skip(!forced, 'engine does not emulate forced-colors');
  for (const name of ['Email', 'Chế độ tối']) {
    const control = name === 'Email' ? page.getByRole('checkbox', { name }) : page.getByRole('switch', { name });
    // keyboard focus (so :focus-visible applies): leave and re-enter the control with Tab/Shift+Tab
    for (const keys of [['Tab', 'Shift+Tab'], ['Shift+Tab', 'Tab']]) {
      await control.focus();
      for (const key of keys) await page.keyboard.press(key);
      if (await control.evaluate((element) => element === document.activeElement)) break;
    }
    const outline = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return { focused: element === document.activeElement, style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(outline.focused, name).toBe(true);
    expect(outline.style, name).not.toBe('none');
    expect(outline.width, name).toBeGreaterThanOrEqual(2);
  }
});

test('mixed and disabled states are exposed', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('checkbox', { name: 'Chọn tất cả' })).toHaveAttribute('aria-checked', 'mixed');
  await expect(page.getByRole('checkbox', { name: 'Không khả dụng' })).toHaveAttribute('aria-disabled', 'true');
});

test.describe('coarse pointer', () => {
  test.use({ hasTouch: true });

  test('coarse pointer hit area without overlap in a native fieldset list', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'engine does not report (pointer: coarse) for a touch context');
    const names = ['Email', 'SMS', 'Thông báo đẩy'];
    const boxes: Box[] = [];
    const labels: Box[] = [];
    for (const name of names) {
      const box = await page.getByRole('checkbox', { name }).boundingBox();
      const label = await page.locator('label', { hasText: name }).boundingBox();
      expect(box!.width + EPSILON, name).toBeGreaterThanOrEqual(44);
      expect(box!.height + EPSILON, name).toBeGreaterThanOrEqual(44);
      boxes.push(box!);
      labels.push(label!);
    }
    for (let i = 0; i < names.length; i += 1) {
      for (let j = 0; j < names.length; j += 1) {
        if (i === j) continue;
        expect(overlaps(boxes[i]!, boxes[j]!), `${names[i]} box / ${names[j]} box`).toBe(false);
        expect(overlaps(boxes[i]!, labels[j]!), `${names[i]} box / ${names[j]} label`).toBe(false);
      }
    }
  });
});

test('clicking a checkbox toggles it once', async ({ page }) => {
  await open(page);
  const email = page.getByRole('checkbox', { name: 'Email' });
  await email.click();
  await expect(email).toHaveAttribute('aria-checked', 'true');
  await page.locator('label', { hasText: 'Email' }).click();
  await expect(email).toHaveAttribute('aria-checked', 'false');
});

test('toggle scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
