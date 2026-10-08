import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type Placement = { label: string; sameLine: boolean; markerInsideLabel: boolean; overflow: boolean };

async function markerPlacement(page: Page): Promise<Placement[]> {
  return page.evaluate(() => [...document.querySelectorAll('label')].map((label) => {
    const marker = label.querySelector('[aria-hidden="true"]');
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (!marker || !textNode?.textContent) return { label: label.textContent ?? '', sameLine: false, markerInsideLabel: false, overflow: true };
    const range = document.createRange();
    const end = textNode.textContent.trimEnd().length;
    range.setStart(textNode, end - 1);
    range.setEnd(textNode, end);
    const last = range.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      label: label.textContent ?? '',
      sameLine: Math.abs(markerRect.top - last.top) < Math.max(4, last.height / 2),
      markerInsideLabel: markerRect.right <= labelRect.right + 1 && markerRect.left >= labelRect.left - 1,
      overflow: label.scrollWidth > label.clientWidth + 1,
    };
  }));
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?scenario=field');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.locator('label')).toHaveCount(3);
});

test('required marker stays inline at 320px', async ({ page }) => {
  for (const placement of await markerPlacement(page)) {
    expect(placement, placement.label).toMatchObject({ sameLine: true, markerInsideLabel: true });
  }
});

test('required marker stays inline at 200% zoom', async ({ page }) => {
  await page.evaluate(() => { document.documentElement.style.setProperty('zoom', '2'); });
  for (const placement of await markerPlacement(page)) {
    expect(placement, placement.label).toMatchObject({ sameLine: true, markerInsideLabel: true });
  }
});

test('Field scenario has no axe violations (light)', async ({ page }) => {
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
