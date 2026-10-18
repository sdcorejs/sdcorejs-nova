import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
test('case-p2-d04-ac02-browser double expansion, collapse, retry and late response ownership',async({page})=>{
  await page.goto('/?scenario=p2-d04'); const root=page.getByRole('treeitem',{name:'Root',exact:true});await root.focus();await root.press('ArrowRight');await root.press('ArrowRight');await expect(page.getByRole('status',{name:'Reads'})).toHaveText('1');await expect(root).toHaveAttribute('aria-busy','true');await expect(page.getByText('Loading children for Root')).toBeVisible();
  await root.press('ArrowLeft');await expect(page.getByRole('status',{name:'Aborts'})).toHaveText('1');await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('treeitem',{name:'Child',exact:true})).toHaveCount(0);
  await root.press('ArrowRight');await expect(page.getByRole('status',{name:'Reads'})).toHaveText('2');await page.getByRole('button',{name:'Fail oldest'}).click();await expect(page.getByRole('alert')).toHaveText('Unable to load children for Root');await expect(page.getByText('private error')).toHaveCount(0);await page.getByRole('button',{name:'Retry Root',exact:true}).click();await expect(page.getByRole('status',{name:'Reads'})).toHaveText('3');await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('treeitem',{name:'Child',exact:true})).toBeVisible();await expect(page.getByRole('status',{name:'Reads'})).toHaveText('3');
});

test('case-p2-d04-ac02-browser scope change and unmount abort pending branches and ignore late results',async({page})=>{
  await page.goto('/?scenario=p2-d04');const root=page.getByRole('treeitem',{name:'Root',exact:true});await root.press('ArrowRight');await page.getByRole('button',{name:'Change scope'}).click();await expect(page.getByRole('status',{name:'Aborts'})).toHaveText('1');await expect(page.getByRole('status',{name:'Reads'})).toHaveText('2');await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('treeitem',{name:'Child',exact:true})).toHaveCount(0);await expect(root).toHaveAttribute('aria-busy','true');await page.getByRole('button',{name:'Toggle tree'}).click();await expect(page.getByRole('status',{name:'Aborts'})).toHaveText('2');await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('tree',{name:'Files'})).toHaveCount(0);
});
test('case-p2-d04-ac03-browser full roving keyboard, typed actions, independent selection and focus recovery',async({page})=>{
  await page.goto('/?scenario=p2-d04');const root=page.getByRole('treeitem',{name:'Root',exact:true}),zero=page.getByRole('treeitem',{name:'String zero',exact:true});await root.focus();await root.press('ArrowRight');await page.getByRole('button',{name:'Resolve oldest'}).click();await root.focus();await root.press('ArrowRight');const child=page.getByRole('treeitem',{name:'Child',exact:true});await expect(child).toBeFocused();await expect(child).toHaveAttribute('aria-level','2');await expect(child).toHaveAttribute('aria-posinset','1');await expect(child).toHaveAttribute('aria-setsize','1');await child.press('ArrowDown');await expect(zero).toBeFocused();await zero.press('ArrowUp');await expect(child).toBeFocused();await child.press('ArrowLeft');await expect(root).toBeFocused();await root.press('End');await expect(zero).toBeFocused();await zero.press('Space');await expect(page.getByRole('status',{name:'Selected'})).toHaveText('["0"]');await zero.press('Home');await expect(root).toBeFocused();await expect(root).toHaveAttribute('aria-selected','false');await root.press('ArrowRight');await expect(child).toBeFocused();
  await page.getByRole('button',{name:'Collapse externally'}).evaluate((button:HTMLButtonElement)=>button.click());await expect(root).toBeFocused();await page.getByRole('button',{name:'Actions for Root',exact:true}).click();await page.getByRole('menuitem',{name:'Inspect'}).click();await expect(page.getByRole('status',{name:'Action'})).toHaveText('number:0');await page.getByRole('button',{name:'Actions for String zero',exact:true}).click();await page.getByRole('menuitem',{name:'Inspect'}).click();await expect(page.getByRole('status',{name:'Action'})).toHaveText('string:0');
});
test('case-p2-d04-ac03-browser mobile hit targets, no horizontal overflow and automated accessibility',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/?scenario=p2-d04');const expand=page.getByRole('button',{name:'Expand Root',exact:true});const box=await expand.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);await expand.click();await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('treeitem',{name:'Child',exact:true})).toBeVisible();expect(await page.getByRole('tree',{name:'Files'}).evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);const results=await new AxeBuilder({page}).include('.nova-tree').analyze();expect(results.violations).toEqual([]);
});
test('case-p2-d04-ac01-ssr-browser actual server markup hydrates without recovery and remains interactive',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/?scenario=p2-d04');await expect(page.locator('#root')).toHaveAttribute('data-hydration','complete');await expect(page.locator('#root')).toHaveAttribute('data-recoverable-errors','0');await page.getByRole('treeitem',{name:'Root',exact:true}).press('ArrowRight');await page.getByRole('button',{name:'Resolve oldest'}).click();await expect(page.getByRole('treeitem',{name:'Child',exact:true})).toBeVisible();await expect(page.locator('#root')).toHaveAttribute('data-recoverable-errors','0');expect(errors).toEqual([]);
});

for (const activation of ['Enter', 'Space'] as const) {
  test(`case-p2-d04-r1-browser keyboard Retry ${activation} preserves branch focus and later outside focus`, async ({ page }) => {
    await page.goto('/?scenario=p2-d04');
    const root = page.getByRole('treeitem', { name: 'Root', exact: true });
    await root.focus();
    await root.press('ArrowRight');
    await page.getByRole('button', { name: 'Fail oldest' }).click();
    await expect(page.getByRole('alert')).toHaveText('Unable to load children for Root');
    const retry = page.getByRole('button', { name: 'Retry Root', exact: true });
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.press(activation);
    await expect(page.getByRole('status', { name: 'Reads' })).toHaveText('2');
    await expect(root).toHaveAttribute('aria-busy', 'true');
    await expect(retry).toHaveCount(0);
    await expect(root).toBeFocused();
    await expect(root).toHaveAttribute('tabindex', '0');
    await root.press('ArrowDown');
    await expect(page.getByRole('treeitem', { name: 'String zero', exact: true })).toBeFocused();
    const outside = page.getByRole('button', { name: 'Change scope', exact: true });
    await outside.focus();
    await expect(outside).toBeFocused();
    await page.getByRole('button', { name: 'Resolve oldest', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByRole('treeitem', { name: 'Child', exact: true })).toBeVisible();
    await expect(outside).toBeFocused();
    await expect(page.getByRole('status', { name: 'Reads' })).toHaveText('2');
  });
}
