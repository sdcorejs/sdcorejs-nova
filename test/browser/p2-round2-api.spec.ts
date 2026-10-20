import { expect, test } from '@playwright/test';

const open = (page: import('@playwright/test').Page) => page.goto('/?scenario=p2-round2-api');

test('case-r2-q4-browser dialog named and custom widths, capped by the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await open(page);
  for (const [name, width] of [['default', 512], ['sm', 400], ['md', 560], ['lg', 800], ['480', 480], ['640px', 640]] as const) {
    await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Contract' }); await expect(dialog).toBeVisible();
    expect(Math.round((await dialog.boundingBox())!.width)).toBe(width);
    await dialog.getByRole('button', { name: 'Cancel contract' }).click(); await expect(dialog).toHaveCount(0);
  }
  await page.setViewportSize({ width: 375, height: 740 });
  await page.getByRole('button', { name: 'Open lg', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Contract' }); await expect(dialog).toBeVisible();
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(375 - 32);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('case-r2-q4-browser footer stays visible under the scrolling body for Dialog and Sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 }); await open(page);
  await page.getByRole('button', { name: 'Open md', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Contract' }), save = dialog.getByRole('button', { name: 'Save contract' });
  await expect(save).toBeInViewport();
  const body = dialog.locator('.nova-dialog__body'), before = (await save.boundingBox())!.y;
  expect(await body.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await body.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(dialog.getByText('Clause 40')).toBeInViewport(); await expect(save).toBeInViewport();
  expect((await save.boundingBox())!.y).toBe(before);
  const box = (await dialog.boundingBox())!, footer = (await dialog.locator('.nova-dialog__footer').boundingBox())!;
  expect(Math.round(footer.y + footer.height)).toBe(Math.round(box.y + box.height - 1));
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Open sheet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' }); await expect(sheet.getByRole('button', { name: 'Apply filters' })).toBeInViewport();
  await sheet.locator('.nova-dialog__body').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(sheet.getByRole('button', { name: 'Apply filters' })).toBeInViewport();
});

test('case-r2-q6-browser danger menu item uses the danger color and error surface while highlighted', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Contract actions' }).click();
  const danger = page.getByRole('menuitem', { name: 'Delete contract' }), neutral = page.getByRole('menuitem', { name: 'Open contract' });
  await expect(danger).toBeVisible();
  expect(await danger.evaluate(node => getComputedStyle(node).color)).toBe('rgb(180, 35, 24)');
  expect(await neutral.evaluate(node => getComputedStyle(node).color)).not.toBe('rgb(180, 35, 24)');
  await danger.focus(); await expect(danger).toHaveAttribute('data-highlighted');
  expect(await danger.evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgb(254, 243, 242)');
  await danger.click(); await expect(page.getByRole('status', { name: 'Deleted' })).toHaveText('1');
});

test('case-r2-q1-browser page-size select by keyboard proposes the first page; first/last stay bounded', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await open(page);
  const navigation = page.getByRole('navigation', { name: 'Table pagination' }), state = page.getByRole('status', { name: 'Page state' });
  await expect(navigation.locator('.nova-table-pagination__range')).toHaveText('41–60 of 95');
  const select = navigation.getByRole('combobox', { name: 'Rows per page' }); await expect(select).toHaveText('20');
  await select.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible(); await expect(page.getByRole('option')).toHaveText(['20', '50', '100']);
  await page.getByRole('option', { name: '50' }).focus(); await page.keyboard.press('Enter');
  await expect(state).toHaveText('{"pageIndex":0,"pageSize":50}'); await expect(select).toBeFocused();
  await expect(navigation.getByRole('button', { name: 'First page' })).toBeDisabled();
  await navigation.getByRole('button', { name: 'Last page' }).click(); await expect(state).toHaveText('{"pageIndex":1,"pageSize":50}');
  await expect(navigation.getByRole('button', { name: 'Last page' })).toBeDisabled();
  for (const name of ['First page', 'Previous page', 'Next page', 'Last page']) { const box = (await navigation.getByRole('button', { name }).boundingBox())!; expect(Math.round(box.width)).toBe(28); expect(Math.round(box.height)).toBe(28); }
  expect(Math.round((await select.boundingBox())!.height)).toBe(28);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const name of ['First page', 'Previous page', 'Next page', 'Last page']) { const box = (await navigation.getByRole('button', { name }).boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('case-r2-q20-browser empty read-only value shows -- and exposes the unavailable text instead', async ({ page }) => {
  await open(page);
  const value = page.getByTestId('empty-value').locator('dd');
  await expect(value.locator('[aria-hidden="true"]')).toHaveText('--');
  await expect(value).toHaveText('--Unavailable');
  expect(await value.locator('.nova-visually-hidden').evaluate(node => { const box = node.getBoundingClientRect(); return box.width <= 1 && box.height <= 1; })).toBe(true);
  await expect(page.getByTestId('empty-value')).toMatchAriaSnapshot('- term: Manager\n- definition: Unavailable');
});

test('case-r2-q9-browser sidebar is a 300px start drawer below 1024 and inline from 1024', async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 800 }); await page.goto('/?scenario=p1-app-shell');
  const trigger = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(page.getByRole('complementary', { name: 'Không gian làm việc' })).toBeHidden();
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Không gian làm việc' }); await expect(drawer).toBeVisible();
  const box = (await drawer.boundingBox())!; expect(Math.round(box.x)).toBe(0); expect(Math.round(box.width)).toBe(300); expect(Math.round(box.height)).toBe(800);
  await page.keyboard.press('Escape'); await expect(drawer).toHaveCount(0); await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 740 }); await trigger.click();
  const narrow = (await page.getByRole('dialog', { name: 'Không gian làm việc' }).boundingBox())!; expect(Math.round(narrow.x)).toBe(0); expect(Math.round(narrow.width)).toBe(320 - 32);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.getByRole('complementary', { name: 'Không gian làm việc' })).toBeVisible();
  await trigger.click(); await expect(page.getByRole('dialog')).toHaveCount(0);
});
