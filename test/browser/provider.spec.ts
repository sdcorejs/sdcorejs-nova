import { expect, test, type Page } from '@playwright/test';

import { colorTokens } from '../../src/tokens/tokens.js';

type Values = Record<string, Record<string, string>>;
const { light, dark } = colorTokens;

async function open(page: Page, colorScheme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme });
  await page.goto('/?scenario=provider');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.locator('#shared-host [data-probe="B-portal"]')).toHaveCount(1);
}

const readValues = (page: Page) => page.evaluate(() => (window as unknown as { __read: () => Values }).__read());
const background = (values: Values, id: string) => values[id]?.['--nova-color-background'];
const action = (values: Values, id: string) => values[id]?.['--nova-color-action'];

for (const scheme of ['light', 'dark'] as const) {
  test(`computed --nova-* in sibling roots, shared host, nested light/dark/system (${scheme} OS)`, async ({ page }) => {
    await open(page, scheme);
    const values = await readValues(page);
    expect(background(values, 'A')).toBe(dark.background);
    expect(background(values, 'B')).toBe(light.background);
    expect(background(values, 'B-dark')).toBe(dark.background);
    expect(background(values, 'A-system')).toBe(scheme === 'dark' ? dark.background : light.background);
    expect(background(values, 'A-portal')).toBe(dark.background);
    expect(background(values, 'B-portal')).toBe(light.background);
    const host = await page.evaluate(() => {
      const element = document.getElementById('shared-host')!;
      return {
        attributes: [...element.attributes].map((attribute) => attribute.name),
        wrappers: [...element.children].map((child) => [child.className, child.getAttribute('data-nova-theme'), child.getAttribute('dir'), child.getAttribute('lang')]),
      };
    });
    expect(host.attributes).toEqual(['id']);
    expect(host.wrappers).toEqual([
      ['nova-theme brand', 'dark', 'rtl', 'en'],
      ['nova-theme', 'light', 'ltr', 'vi'],
    ]);
  });
}

test('consumer class override identical before and after hydration and inside portal', async ({ page }) => {
  await open(page, 'light');
  const before = await page.evaluate(() => (window as unknown as { __before: Values }).__before);
  const after = await readValues(page);
  expect(action(before, 'A')).toBe('#654321');
  expect(action(after, 'A')).toBe('#654321');
  expect(action(after, 'A-portal')).toBe('#654321');
  expect(action(after, 'B')).toBe(light.action);
  for (const id of ['A', 'A-system', 'B', 'B-dark', 'limit-in', 'limit-out']) {
    expect(after[id], id).toEqual(before[id]);
  }
  expect(await page.evaluate(() => (window as unknown as { __recoverable: string[] }).__recoverable)).toEqual([]);
});

test('ancestor var without class is shadowed inside scope (documented limitation)', async ({ page }) => {
  await open(page, 'light');
  const values = await readValues(page);
  expect(action(values, 'limit-in')).toBe(light.action);
  expect(action(values, 'limit-out')).toBe('red');
});
