import { expect, test } from '@playwright/test';

for (const action of ['Cancel', 'Reset']) test(`F14 ${action} settles ignored abort without submitting`, async ({page}) => {
  await page.goto('/?scenario=p1-form-validation');
  await page.getByRole('textbox', {name: 'Tên', exact: true}).fill('Tiếng Việt');
  await page.getByRole('button', {name: 'Validate', exact: true}).click();
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', {name: action, exact: true}).click();
  await expect(page.getByRole('status', {name: 'Results', exact: true})).toHaveText(action === 'Cancel' ? 'cancelled:cancelled' : 'cancelled:reset');
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', {name: 'Resolve first', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Submitted', exact: true})).toHaveText('');
});

test('F14 latest snapshot alone submits and retains native form payload', async ({page}) => {
  await page.goto('/?scenario=p1-form-validation');
  const input = page.getByRole('textbox', {name: 'Tên', exact: true});
  await input.fill('Old');
  await page.getByRole('button', {name: 'Validate', exact: true}).click();
  await input.fill('Mới');
  await page.getByRole('button', {name: 'Validate', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Results', exact: true})).toHaveText('cancelled:superseded');
  await page.getByRole('button', {name: 'Resolve second', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Submitted', exact: true})).toHaveText('Mới');
  await page.getByRole('button', {name: 'Resolve first', exact: true}).click();
  await expect(page.getByRole('status', {name: 'Submitted', exact: true})).toHaveText('Mới');
  const payload = await page.getByRole('form').evaluate(form => [...new FormData(form as HTMLFormElement)]);
  expect(payload).toEqual([['name', 'Mới']]);
});
