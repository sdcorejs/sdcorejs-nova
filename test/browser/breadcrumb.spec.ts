import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=breadcrumb');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('ltr').getByRole('navigation')).toHaveCount(1);
}

test('narrow container collapses middle items behind an inline disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  const nav = page.getByTestId('ltr');
  const toggle = nav.getByRole('button');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: 'Tài liệu dự án' })).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Trang chủ' })).toBeVisible();
  await expect(nav.getByText('Báo cáo tài chính quý ba')).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: 'Tài liệu dự án' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Năm 2026' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('wide container shows every item and no disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const nav = page.getByTestId('ltr');
  await expect(nav.getByRole('button')).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Tài liệu dự án' })).toBeVisible();
});

test('RTL separators and order are mirrored', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const rtl = page.getByTestId('rtl');
  const first = (await rtl.getByRole('link', { name: 'Trang chủ' }).boundingBox())!;
  const last = (await rtl.getByText('Tệp đính kèm').boundingBox())!;
  expect(first.x).toBeGreaterThan(last.x);
  const transform = await rtl.locator('.nova-breadcrumb__separator').first().evaluate((element) => getComputedStyle(element).transform);
  expect(transform).not.toBe('none');
});

test('unsafe Link renders text that cannot navigate', async ({ page }) => {
  await open(page);
  const unsafe = page.getByTestId('unsafe');
  expect(await unsafe.evaluate((element) => element.tagName)).toBe('SPAN');
  await unsafe.click();
  expect(page.url()).toContain('scenario=breadcrumb');
});

test('breadcrumb scenario has no axe violations (collapsed and expanded)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  const collapsed = await new AxeBuilder({ page }).include('#root').analyze();
  expect(collapsed.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  await page.getByTestId('ltr').getByRole('button').click();
  const expanded = await new AxeBuilder({ page }).include('#root').analyze();
  expect(expanded.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

// custom renderer containment and touch targets.
const LONG_LABEL = 'Thư_mục_tổ_tiên_có_tên_cực_kỳ_dài_không_có_điểm_ngắt_dòng_dùng_để_kiểm_tra_việc_thu_gọn_không_làm_tràn_trang';

test('a custom renderLink anchor with a long label stays inside 320px and keeps its full name', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page);
  const custom = page.getByTestId('custom');
  const toggle = custom.getByRole('button');
  if (await toggle.isVisible()) await toggle.click();
  const anchor = custom.getByRole('link', { name: LONG_LABEL });
  await expect(anchor).toBeVisible();
  const box = (await anchor.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test.describe('coarse pointer', () => {
  test.use({ hasTouch: true });

  test('default and custom breadcrumb anchors are ≥ 44×44 and do not overlap', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'engine does not report (pointer: coarse) for a touch context');
    const anchors = page.locator('[data-testid="ltr"] nav a, [data-testid="custom"] nav a');
    const count = await anchors.count();
    expect(count).toBeGreaterThanOrEqual(5);
    const boxes = [];
    for (let index = 0; index < count; index += 1) {
      const box = (await anchors.nth(index).boundingBox())!;
      expect(box.width + 0.01, `anchor ${index}`).toBeGreaterThanOrEqual(44);
      expect(box.height + 0.01, `anchor ${index}`).toBeGreaterThanOrEqual(44);
      boxes.push(box);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
        expect(overlap, `anchors ${i}/${j}`).toBe(false);
      }
    }
  });
});
