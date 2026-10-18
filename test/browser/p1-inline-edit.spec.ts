import { expect, test } from '@playwright/test';

test('F12 keyboard entry, singleflight and controlled acknowledgement', async ({page}) => {
  await page.goto('/?scenario=p1-inline-edit');
  const face = page.getByRole('button', {name: 'Edit Name', exact: true});
  await face.focus();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', {name: 'Draft', exact: true});
  await expect(input).toBeFocused();
  await input.fill('Tiếng Việt');
  const save = page.getByRole('button', {name: 'Save', exact: true});
  await save.click();
  await expect(save).toBeDisabled();
  await save.dispatchEvent('click');
  await expect(page.getByRole('status', {name: 'Calls', exact: true})).toHaveText('1');
  await page.getByRole('button', {name: 'Complete save', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Accepted', exact: true})).toHaveText('Tiếng Việt');
  await expect(input).toBeVisible();
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toBeDisabled();
  await page.getByRole('button', {name: 'Acknowledge', exact: true}).click();
  await expect(input).toHaveCount(0);
  await expect(face).toBeFocused();
  await expect(face).toHaveText('Tiếng Việt');
});

test('F12 Escape cancels pending save and late completion cannot commit', async ({page}) => {
  await page.goto('/?scenario=p1-inline-edit');
  const face = page.getByRole('button', {name: 'Edit Name', exact: true});
  await face.click();
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await page.keyboard.press('Escape');
  await expect(face).toBeFocused();
  await expect(page.getByRole('status', {name: 'Aborted', exact: true})).toHaveText('true');
  await page.getByRole('button', {name: 'Complete save', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Accepted', exact: true})).toHaveText('');
});

test('F12 dirty revision requires explicit reload or rebase', async ({page}) => {
  await page.goto('/?scenario=p1-inline-edit');
  await page.getByRole('button', {name: 'Edit Name', exact: true}).click();
  await page.getByRole('textbox', {name: 'Draft', exact: true}).fill('Local');
  await page.getByRole('button', {name: 'Remote change', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
  await page.getByRole('button', {name: 'Reload', exact: true}).click();
  await expect(page.getByRole('textbox', {name: 'Draft', exact: true})).toHaveValue('Remote');
});
