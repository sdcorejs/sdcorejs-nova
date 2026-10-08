import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page): Promise<void> {
  await page.goto('/?scenario=radio');
  await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Email' })).toHaveCount(1);
}

const checked = (page: Page, name: string) => page.getByRole('radio', { name }).getAttribute('aria-checked');

test('Tab enters on the first enabled radio, arrows skip disabled, Tab leaves the group', async ({ page }) => {
  await open(page);
  await page.getByTestId('before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'Email' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Thông báo đẩy' })).toBeFocused();
  expect(await checked(page, 'Thông báo đẩy')).toBe('true');
  expect(await checked(page, 'SMS')).toBe('false');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('submit')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('radio', { name: 'Thông báo đẩy' })).toBeFocused();
});

test('RTL reverses Left/Right', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'One' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Two' })).toBeFocused();
  expect(await checked(page, 'Two')).toBe('true');
});

test('required with null blocks native submission until a choice is made', async ({ page }) => {
  await open(page);
  const valid = () => page.getByTestId('form').evaluate((form) => (form as HTMLFormElement).checkValidity());
  expect(await valid()).toBe(false);
  await page.getByRole('radio', { name: 'Email' }).click();
  expect(await valid()).toBe(true);
  const entries = await page.getByTestId('form').evaluate((form) => [...new FormData(form as HTMLFormElement).entries()]);
  expect(entries).toEqual([['channel', 's:email']]);
});

test('radio scenario has no axe violations', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#root').analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

// a CSS-hidden checked radio is not a dead end.
test('focusFirstInvalid skips a CSS-hidden checked radio and focuses a visible enabled one', async ({ page }) => {
  await open(page);
  const form = page.getByTestId('hidden-checked-form');
  await expect(form.getByRole('radio', { name: 'Kênh A' })).toBeHidden();
  await form.getByTestId('focus-invalid').click();
  await expect(form.getByRole('radio', { name: 'Kênh B' })).toBeFocused();
  await expect(form).not.toHaveAttribute('data-focused', 'none');
});
