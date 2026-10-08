import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=avatar');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('broken')).toHaveCount(1);
}

test('image error shows NA and keeps the same box as a loaded image', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('loaded').locator('img')).toHaveCount(1);
  await expect(page.getByTestId('broken')).toHaveText('NA');
  const loaded = (await page.getByTestId('loaded').boundingBox())!;
  const broken = (await page.getByTestId('broken').boundingBox())!;
  const empty = (await page.getByTestId('empty').boundingBox())!;
  for (const box of [broken, empty]) {
    expect(Math.abs(box.width - loaded.width)).toBeLessThan(0.5);
    expect(Math.abs(box.height - loaded.height)).toBeLessThan(0.5);
  }
  expect(loaded.width).toBeGreaterThan(0);
});

test('group shows max avatars plus an accessible overflow count', async ({ page }) => {
  await open(page);
  const group = page.getByRole('group', { name: 'Thành viên' });
  await expect(group.getByText('+2')).toHaveCount(1);
  await expect(group.getByRole('img')).toHaveCount(3);
});

test('avatar scenario has no axe violations', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('broken')).toHaveText('NA');
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
