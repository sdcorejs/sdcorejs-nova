import { expect, test } from '@playwright/test';

test('C14 desktop skip focus preserves route and collapsing sidebar retains page input', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto('/?scenario=p1-app-shell#/files');
  await page.getByRole('link', {name: 'Tới nội dung'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  expect(new URL(page.url()).hash).toBe('#/files');
  await page.getByRole('textbox', {name: 'Nội dung'}).fill('Tiếng Việt có dấu');
  await page.getByRole('button', {name: 'Menu', exact: true}).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.getByRole('button', {name: 'Menu', exact: true}).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('textbox', {name: 'Nội dung'})).toHaveValue('Tiếng Việt có dấu');
});

test('C14 custom portal escapes transformed clipping ancestors and retains callback ownership', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  await page.goto('/?scenario=p1-app-shell&clipped=1');
  await page.getByRole('button', {name: 'Menu', exact: true}).click();
  const dialog = page.locator('#configured-portal').getByRole('dialog', {name: 'Không gian làm việc'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: 'Hành động menu'}).click();
  await expect(dialog.getByRole('status', {name: 'Số hành động'})).toHaveText('1');
  const size = await dialog.boundingBox();
  expect(size).not.toBeNull();
  expect(size!.height).toBeGreaterThan(200);
  expect(size!.y + size!.height).toBeLessThanOrEqual(740);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Menu', exact: true})).toBeFocused();
});

for (const dark of [false, true]) test(`C14 mobile drawer keyboard, overflow and breakpoint cleanup ${dark ? 'dark' : 'light'}`, async ({page}, testInfo) => {
  await page.setViewportSize({width: 320, height: 740});
  await page.goto('/?scenario=p1-app-shell');
  if (dark) await page.getByRole('button', {name: 'Đổi giao diện'}).click();
  const trigger = page.getByRole('button', {name: 'Menu', exact: true});
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: 'Không gian làm việc'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', {name: 'Bản nháp menu'}).fill('Bản nháp mobile');
  await dialog.getByRole('button', {name: 'Hành động menu'}).click();
  await expect(dialog.getByRole('status', {name: 'Số hành động'})).toHaveText('1');
  await dialog.getByRole('link', {name: 'Tệp và tài liệu của tôi'}).click();
  await expect(dialog.getByRole('status', {name: 'Đã điều hướng'})).toHaveText('files');
  await expect(page.locator('#menu-draft')).toHaveCount(1);
  await expect(dialog.getByRole('link', {name: 'Tệp và tài liệu của tôi'})).toHaveAttribute('aria-current', 'page');
  const size = await dialog.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const body = element.querySelector('.nova-dialog__body')!;
    const link = element.querySelector('a')!;
    return {left: rect.left, right: rect.right, scrollable: body.scrollHeight > body.clientHeight, target: link.getBoundingClientRect().height};
  });
  expect(size.left).toBeGreaterThanOrEqual(0);
  expect(size.right).toBeLessThanOrEqual(320);
  expect(size.scrollable).toBe(true);
  expect(size.target).toBeGreaterThanOrEqual(44);
  await page.screenshot({path: testInfo.outputPath(`c14-mobile-${dark ? 'dark' : 'light'}.png`)});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', {name: 'Bản nháp menu'})).toHaveValue('Bản nháp mobile');
  await expect(dialog.getByRole('status', {name: 'Số hành động'})).toHaveText('1');
  await page.setViewportSize({width: 1280, height: 800});
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({width: 320, height: 740});
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
