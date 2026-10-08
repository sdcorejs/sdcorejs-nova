import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=input');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('email')).toHaveCount(1);
}

const fontSize = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((element) => getComputedStyle(element).fontSize);

test('16px font at mobile viewport (no iOS focus zoom)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page);
  for (const id of ['email', 'price', 'notes']) expect(await fontSize(page, id), id).toBe('16px');
});

test('desktop keeps the 14px body size', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const fine = await page.evaluate(() => matchMedia('(pointer: fine)').matches);
  test.skip(!fine, 'engine does not report (pointer: fine)');
  expect(await fontSize(page, 'email')).toBe('14px');
});

test('typing at 320px keeps the control inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  await page.getByTestId('email').fill('nguyen.van.an.rat.dai@example.com');
  const box = await page.getByTestId('email').boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('input scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

// the control itself is the touch target.
test.describe('coarse pointer', () => {
  test.use({ hasTouch: true });

  test('inputs and textarea are ≥ 44×44 and overlap neither each other nor their labels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await open(page);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'engine does not report (pointer: coarse) for a touch context');
    const ids = ['email', 'price', 'notes'];
    const boxes = await Promise.all(ids.map(async (id) => (await page.getByTestId(id).boundingBox())!));
    const labels = await Promise.all(['Email', 'Giá', 'Ghi chú'].map(async (name) => (await page.locator('label', { hasText: name }).first().boundingBox())!));
    const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
    for (const [index, item] of boxes.entries()) {
      expect(item.height + 0.01, ids[index]).toBeGreaterThanOrEqual(44);
      expect(item.width + 0.01, ids[index]).toBeGreaterThanOrEqual(44);
      for (const label of labels) expect(overlaps(item, label), `${ids[index]} vs label`).toBe(false);
      for (const [other, otherBox] of boxes.entries()) if (other !== index) expect(overlaps(item, otherBox)).toBe(false);
    }
  });
});

test('mobile input text is 16/24', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page);
  for (const id of ['email', 'price']) {
    expect(await page.getByTestId(id).evaluate((element) => getComputedStyle(element).lineHeight), id).toBe('24px');
  }
});

// real keyboard after a native reset.
for (const kind of ['input', 'textarea'] as const) {
  test(`${kind}: typing back the pre-reset value after form.reset() emits once per edit`, async ({ page }) => {
    await open(page);
    const field = page.getByTestId(`reset-${kind}`);
    const log = page.getByTestId(`reset-${kind}-log`);
    await field.click();
    await field.press('End');
    await page.keyboard.type('d');
    await expect(field).toHaveValue('abcd');
    await expect(log).toHaveAttribute('data-log', JSON.stringify(['abcd']));
    await page.getByTestId('reset-form').evaluate((form) => (form as HTMLFormElement).reset());
    await expect(field).toHaveValue('abc');
    await field.evaluate((element) => {
      const control = element as HTMLInputElement | HTMLTextAreaElement;
      control.focus();
      control.setSelectionRange(control.value.length, control.value.length);
    });
    await page.keyboard.type('d');
    await expect(field).toHaveValue('abcd');
    await expect(log).toHaveAttribute('data-log', JSON.stringify(['abcd', 'abcd']));
    await page.keyboard.press('Backspace');
    await expect(log).toHaveAttribute('data-log', JSON.stringify(['abcd', 'abcd', 'abc']));
  });
}
