import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type Layout = { gap: number; children: number; overflow: boolean; overlapsDismiss: boolean };

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=alert');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByTestId('title-only')).toHaveCount(1);
}

async function layout(page: Page, testId: string): Promise<Layout> {
  return page.getByTestId(testId).evaluate((alert) => {
    const content = alert.querySelector('.nova-alert__content') as HTMLElement;
    const children = [...content.children] as HTMLElement[];
    const childHeight = children.reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);
    const style = getComputedStyle(content);
    const rowGap = Number.parseFloat(style.rowGap) || 0;
    const dismiss = alert.querySelector('.nova-alert__dismiss')?.getBoundingClientRect();
    const box = content.getBoundingClientRect();
    return {
      gap: box.height - childHeight - rowGap * Math.max(0, children.length - 1),
      children: children.length,
      overflow: alert.scrollWidth > alert.clientWidth + 1,
      overlapsDismiss: dismiss ? dismiss.left < box.right - 0.5 && box.left < dismiss.right - 0.5 && dismiss.top < box.bottom && box.top < dismiss.bottom : false,
    };
  });
}

test('title-only/action-only/body-only without blank gap at narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await open(page);
  for (const id of ['title-only', 'body-only', 'action-only']) {
    const result = await layout(page, id);
    expect(result.children, id).toBe(1);
    expect(Math.abs(result.gap), id).toBeLessThan(1);
    expect(result.overflow, id).toBe(false);
    expect(result.overlapsDismiss, id).toBe(false);
  }
  const full = await layout(page, 'full');
  expect(full.children).toBe(3);
  expect(Math.abs(full.gap)).toBeLessThan(1);
  expect(full.overflow).toBe(false);
});

test('dismiss is a reachable, named button with a 2px focus ring', async ({ page }) => {
  await open(page);
  const dismiss = page.getByTestId('title-only').getByRole('button', { name: 'Đóng thông báo' });
  // keyboard focus (so :focus-visible applies): leave and re-enter with Tab/Shift+Tab
  for (const keys of [['Tab', 'Shift+Tab'], ['Shift+Tab', 'Tab']]) {
    await dismiss.focus();
    for (const key of keys) await page.keyboard.press(key);
    if (await dismiss.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(dismiss).toBeFocused();
  const outline = await dismiss.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth));
  expect(outline).toBeGreaterThanOrEqual(2);
});

test('alert scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
