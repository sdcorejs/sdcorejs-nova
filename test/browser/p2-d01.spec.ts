import { expect, test, type Page } from '@playwright/test';

// Match pointer activation before selecting a native keyboard direction.
// The component must still reach its real region and preserve that focus.
async function nativeButtonTraversal(page: Page): Promise<'Shift+Tab' | 'Tab'> {
  const probe = await page.context().newPage();
  try {
    await probe.setContent('<button type="button" id="before">Before</button><button type="button" id="current">Current</button><button type="button" id="after">After</button>');
    const current = probe.getByRole('button', { name: 'Current', exact: true });
    await current.click();
    await current.focus();
    await current.press('Shift+Tab');
    const target = await probe.evaluate(() => document.activeElement?.id);
    expect(['before', 'current']).toContain(target);
    if (target === 'before') return 'Shift+Tab';
    await current.press('Tab');
    await expect(probe.getByRole('button', { name: 'After', exact: true })).toBeFocused();
    return 'Tab';
  } finally { await probe.close(); }
}
test('case-p2-d01-ac01-browser consumer latest-wins ignores the slow result', async ({ page }) => {
  await page.goto('/?scenario=p2-d01'); const consumer = page.getByRole('region', { name: 'Consumer orchestration' });
  await consumer.getByRole('button', { name: 'New filter' }).click(); await consumer.getByRole('button', { name: 'Resolve new' }).click(); await expect(consumer.getByRole('cell', { name: 'Latest result' })).toBeVisible();
  await consumer.getByRole('button', { name: 'Resolve old' }).click(); await expect(consumer.getByRole('cell', { name: 'Latest result' })).toBeVisible(); await expect(consumer.getByText('Stale result')).toHaveCount(0);
});
test('case-p2-d01-ac02-browser actions receive distinct typed zero rows', async ({ page }) => {
  await page.goto('/?scenario=p2-d01'); const table = page.getByRole('table', { name: 'Files', exact: true }); await expect(table).toBeVisible();
  await table.getByRole('button', { name: 'Row actions 1', exact: true }).click(); await page.getByRole('menuitem', { name: 'Inspect' }).click(); await expect(page.getByRole('status', { name: 'Action', exact: true })).toHaveText('number:0');
  await table.getByRole('button', { name: 'Row actions 2', exact: true }).click(); await page.getByRole('menuitem', { name: 'Inspect' }).click(); await expect(page.getByRole('status', { name: 'Action', exact: true })).toHaveText('string:0');
});
test('case-p2-d01-ac03-browser keyboard page selection skips disabled and preserves missing keys', async ({ page }) => {
  await page.goto('/?scenario=p2-d01'); const table = page.getByRole('table', { name: 'Files', exact: true }), select = table.getByRole('checkbox', { name: 'Select current page' });
  await select.focus(); await select.press('Space'); await expect(page.getByRole('status', { name: 'Selection' })).toHaveText('["missing",0,"0"]'); await expect(table.getByRole('checkbox', { name: 'Select row 3' })).toBeDisabled();
  await select.press('Space'); await expect(page.getByRole('status', { name: 'Selection' })).toHaveText('["missing"]');
});
test('case-p2-d01-ac04-browser explicit unknown-total Next ends without a fabricated last page', async ({ page }) => {
  await page.goto('/?scenario=p2-d01'); const navigation = page.getByRole('navigation', { name: 'Table pagination' }).first(); await navigation.getByRole('button', { name: 'Next page' }).click(); await expect(page.getByRole('status', { name: 'Page', exact: true })).toHaveText('1'); await expect(navigation.getByRole('button', { name: 'Next page' })).toBeDisabled(); await navigation.getByRole('button', { name: 'Previous page' }).click(); await expect(page.getByRole('status', { name: 'Page', exact: true })).toHaveText('0');
});
test('case-p2-d01-ac05-browser keyboard sort and controlled expansion retain focus on refresh/collapse', async ({ page }) => {
  await page.goto('/?scenario=p2-d01'); const table = page.getByRole('table', { name: 'Files', exact: true }), sort = table.getByRole('button', { name: 'Title', exact: true });
  await sort.focus(); await sort.press('Enter'); await expect(table.getByRole('columnheader', { name: 'Title' })).toHaveAttribute('aria-sort', 'ascending'); await sort.press('Space'); await expect(table.getByRole('columnheader', { name: 'Title' })).toHaveAttribute('aria-sort', 'descending');
  const expand = table.getByRole('button', { name: 'Expand row 1', exact: true }); await expand.focus(); await expand.press('Enter'); await expect(table.getByRole('button', { name: 'Collapse row 1', exact: true })).toBeFocused();
  await table.getByRole('button', { name: 'Close detail Number zero' }).click(); await expect(expand).toBeFocused();
  await sort.focus(); await page.getByRole('button', { name: 'Toggle refresh' }).evaluate((button: HTMLButtonElement) => button.click()); await expect(sort).toBeFocused(); await expect(table).toHaveAttribute('aria-busy', 'true');
});
test('case-p2-d01-ac05-browser mobile raw content and controls have parity; fallback scroll stays named', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/?scenario=p2-d01');
  await expect(page.getByRole('table', { name: 'Files', exact: true })).toBeHidden(); const list = page.getByRole('group', { name: 'Files', exact: true }); await expect(list.getByText('Mobile Number zero')).toBeVisible(); await expect(list.getByText('Mobile String zero')).toBeVisible();
  const sort = list.getByRole('button', { name: 'Title', exact: true }); await sort.focus(); await sort.press('Enter'); await expect(page.getByRole('status', { name: 'Sort', exact: true })).toHaveText('[{"columnId":"title","direction":"asc"}]'); const all = list.getByRole('checkbox', { name: 'Select current page' }); await all.focus(); await all.press('Space'); await expect(page.getByRole('status', { name: 'Selection' })).toHaveText('["missing",0,"0"]'); await all.press('Space'); const select = list.getByRole('checkbox', { name: 'Select row 1' }); await select.focus(); await select.press('Space'); await expect(page.getByRole('status', { name: 'Selection' })).toHaveText('["missing",0]'); const box = await select.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  await list.getByRole('button', { name: 'Row actions 2', exact: true }).click(); await page.getByRole('menuitem', { name: 'Inspect' }).click(); await expect(page.getByRole('status', { name: 'Action', exact: true })).toHaveText('string:0');
  await list.getByRole('button', { name: 'Expand row 1', exact: true }).click(); await list.getByRole('button', { name: 'Close detail Number zero' }).click(); await expect(list.getByRole('button', { name: 'Expand row 1', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Toggle mobile renderer' }).click(); await expect(page.getByRole('region', { name: 'Files', exact: true })).toBeVisible(); await expect(page.getByRole('table', { name: 'Files', exact: true })).toBeVisible();
});





test('case-p2-d01-ac01-ssr-browser hydrates deterministic native tables without recovery errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scenario=p2-d01');
  await expect(page.locator('#root')).toHaveAttribute('data-hydration', 'complete');
  const table = page.getByRole('table', { name: 'Files', exact: true });
  await expect(table.getByRole('cell', { name: 'Number zero', exact: true })).toBeVisible();
  await table.getByRole('button', { name: 'Title', exact: true }).press('Enter');
  await expect(table.getByRole('columnheader', { name: 'Title' })).toHaveAttribute('aria-sort', 'ascending');
  await expect(page.locator('#root')).toHaveAttribute('data-hydration', 'complete');
  expect(errors).toEqual([]);
});

test('case-p2-d01-r1-browser external collapse preserves the overflow region after deliberate keyboard navigation', async ({ page }) => {
  const direction = await nativeButtonTraversal(page);
  await page.goto('/?scenario=p2-d01');
  const table = page.getByRole('table', { name: 'Files', exact: true });
  const scroll = page.getByRole('region', { name: 'Files', exact: true });
  await table.getByRole('button', { name: 'Expand row 1', exact: true }).click();
  const keep = table.getByRole('button', { name: 'Keep detail Number zero', exact: true });
  await keep.click();
  await keep.focus();
  const visited = new Set<number>(), focusPath: string[] = [];
  for (;;) {
    if (await scroll.evaluate(node => node === node.ownerDocument.activeElement)) break;
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      return { index: element ? Array.from(document.querySelectorAll('*')).indexOf(element) : -1, label: element ? `${element.tagName}: ${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 60) ?? ''}` : 'no active element' };
    });
    if (visited.has(active.index)) break;
    visited.add(active.index);
    focusPath.push(active.label);
    await page.keyboard.press(direction);
    await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('*')).indexOf(document.activeElement!)), { message: `${direction} must move focus from ${active.label}` }).not.toBe(active.index);
  }
  await expect(scroll, `${direction} focus cycle: ${focusPath.join(' -> ')}`).toBeFocused();
  await page.getByRole('button', { name: 'Collapse rows externally', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(table.getByRole('button', { name: 'Expand row 1', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(scroll).toBeFocused();
});

test('case-p2-d01-design-r2-browser compact desktop table controls and 44px narrow targets', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/?scenario=p2-d01');
  const table = page.getByRole('table', { name: 'Files', exact: true }), navigation = page.getByRole('navigation', { name: 'Table pagination' }).first();
  expect(Math.round((await table.getByRole('columnheader', { name: 'Title' }).boundingBox())!.height)).toBe(40);
  const sort = table.getByRole('button', { name: 'Title', exact: true }); expect(await sort.textContent()).toBe('Title'); expect(Math.round((await sort.boundingBox())!.height)).toBe(28);
  const expand = table.getByRole('button', { name: 'Expand row 1', exact: true }); expect(await expand.textContent()).toBe(''); expect(Math.round((await expand.boundingBox())!.width)).toBe(28);
  for (const name of ['Previous page', 'Next page']) { const button = navigation.getByRole('button', { name }), box = (await button.boundingBox())!; expect(await button.textContent()).toBe(''); expect(Math.round(box.width)).toBe(28); expect(Math.round(box.height)).toBe(28); }
  await page.setViewportSize({ width: 320, height: 740 }); await page.getByRole('button', { name: 'Toggle mobile renderer' }).click(); await expect(table).toBeVisible();
  const [previous, next] = await Promise.all(['Previous page', 'Next page'].map(name => navigation.getByRole('button', { name }).boundingBox()));
  for (const box of [previous!, next!]) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  expect(previous!.x + previous!.width).toBeLessThanOrEqual(next!.x);
  const narrow = (await expand.boundingBox())!; expect(narrow.width).toBeGreaterThanOrEqual(44); expect(narrow.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
