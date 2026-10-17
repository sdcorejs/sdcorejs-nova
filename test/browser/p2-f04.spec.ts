import {expect,test} from '@playwright/test';
import {AxeBuilder} from '@axe-core/playwright';
test('case-p2-f04-ac01-browser keyboard commit, invalid URL and actual hydration',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?scenario=p2-f04');await expect(page.locator('#root')).toHaveAttribute('data-hydration','complete');await expect(page.locator('#root')).toHaveAttribute('data-recoverable-errors','0');
 const input=page.getByRole('textbox',{name:'Brand',exact:true});await input.fill('#aabbcc');await expect(page.getByRole('status',{name:'Proposals'})).toHaveText('0');await input.press('Enter');await expect(input).toHaveValue('#AABBCC');await input.press('Tab');await expect(page.getByRole('status',{name:'Proposals'})).toHaveText('1');await input.fill('url(https://example.test/a)');await input.press('Enter');await expect(input).toHaveValue('url(https://example.test/a)');await expect(input).toHaveAttribute('aria-invalid','true');await expect(page.getByRole('status',{name:'Value'})).toHaveText('#AABBCC');expect(errors).toEqual([]);
});
test('case-p2-f04-ac02-browser alpha text path, null fallback, native RGB and controlled refusal',async({page})=>{
 await page.goto('/?scenario=p2-f04');const brand=page.getByRole('textbox',{name:'Brand',exact:true}),picker=page.getByLabel('Choose color (RGB)',{exact:true}).first();await expect(picker).toHaveValue('#000000');await expect(page.getByRole('status',{name:'Proposals'})).toHaveText('0');await brand.fill('#11223344');await brand.press('Enter');await expect(page.getByRole('status',{name:'Proposals'})).toHaveText('0');const alpha=page.getByRole('textbox',{name:'Alpha',exact:true});await alpha.fill('#aabbcc80');await alpha.press('Enter');await expect(alpha).toHaveValue('#AABBCC80');
 await picker.fill('#445566');await expect(brand).toHaveValue('#445566');const clear=page.getByRole('button',{name:'Clear color',exact:true}).first();await clear.focus();await clear.press('Enter');await expect(brand).toBeFocused();await expect(page.getByRole('status',{name:'Value'})).toHaveText('null');await expect(picker).toHaveValue('#000000');
 const owned=page.getByRole('textbox',{name:'Consumer owned',exact:true});await owned.fill('#ffffff');await owned.press('Enter');await expect(owned).toHaveValue('#112233');await expect(page.getByLabel('Choose color (RGB)',{exact:true}).nth(2)).toHaveValue('#112233');await expect(page.getByRole('textbox',{name:'Read only',exact:true})).toHaveAttribute('readonly','');
});
test('case-p2-f04-ac03-browser mobile targets, light/dark bordered native swatch and axe',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/?scenario=p2-f04');const input=page.getByRole('textbox',{name:'Brand',exact:true}),picker=page.getByLabel('Choose color (RGB)',{exact:true}).first(),clear=page.getByRole('button',{name:'Clear color',exact:true}).first();
 for(const control of [input,picker,clear]){const box=await control.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);}
 for(const theme of ['light','dark']){if(theme==='dark')await page.getByRole('button',{name:'Change theme'}).click();await page.locator('main').evaluate(async node=>{await Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished));});expect(await page.locator('.nova-color-input__swatch').first().evaluate(node=>{const s=getComputedStyle(node);return parseFloat(s.borderTopWidth)>0&&s.borderTopStyle==='solid'&&s.borderTopColor!=='rgba(0, 0, 0, 0)';})).toBe(true);await expect(input).toHaveAccessibleName('Brand');const results=await new AxeBuilder({page}).include('main').analyze();expect(results.violations).toEqual([]);}
 expect(await page.locator('main').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);await input.focus();await input.press('Tab');await expect(picker).toBeFocused();await picker.press('Tab');await expect(clear).toBeFocused();
});
for(const direction of ['Tab','Shift+Tab'] as const){
 test(`case-p2-f04-r1-browser read-only picker permits ${direction} without value proposals`,async({page})=>{
  await page.goto('/?scenario=p2-f04');await expect(page.locator('#root')).toHaveAttribute('data-hydration','complete');
  await page.evaluate(()=>{const outside=document.createElement('button');outside.id='f04-r1-outside';outside.textContent='Outside color controls';document.body.append(outside);});
  const picker=page.getByLabel('Choose color (RGB)',{exact:true}).nth(3),input=page.getByRole('textbox',{name:'Read only',exact:true});await picker.focus();await expect(picker).toBeFocused();await picker.press(direction);
  await expect(direction==='Tab'?page.getByRole('button',{name:'Outside color controls',exact:true}):input).toBeFocused();
  await picker.focus();for(const key of ['Enter','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Backspace','Delete'])await picker.press(key);
  await expect(picker).toHaveValue('#112233');await expect(input).toHaveValue('#112233');await picker.fill('#ffffff');await expect(picker).toHaveValue('#112233');await expect(input).toHaveValue('#112233');await expect(page.getByRole('status',{name:'Proposals'})).toHaveText('0');
 });
}

test('case-p2-f04-ref-browser consumer keyboard focus, Clear return and reset retain the semantic ref',async({page})=>{
 await page.goto('/?scenario=p2-f04&ref-case');await expect(page.locator('#root')).toHaveAttribute('data-hydration','complete');await expect(page.locator('#root')).toHaveAttribute('data-recoverable-errors','0');
 const focus=page.getByRole('button',{name:'Focus ref color',exact:true}),input=page.getByRole('textbox',{name:'Ref color',exact:true}),picker=page.getByLabel('Choose color (RGB)',{exact:true}),clear=page.getByRole('button',{name:'Clear color',exact:true});
 await focus.focus();await focus.press('Enter');await expect(input).toBeFocused();await input.fill('#aabbcc');await input.press('Enter');await expect(input).toHaveValue('#AABBCC');await expect(page.getByRole('status',{name:'Ref proposals'})).toHaveText('1');
 await input.press('Tab');await expect(picker).toBeFocused();await picker.press('Tab');await expect(clear).toBeFocused();await clear.press('Enter');await expect(input).toBeFocused();await expect(input).toHaveValue('');await expect(page.getByRole('status',{name:'Ref proposals'})).toHaveText('2');
 const reset=page.getByRole('button',{name:'Reset ref color',exact:true});await reset.focus();await reset.press('Enter');await expect(input).toHaveValue('#112233');await expect(page.getByRole('status',{name:'Ref proposals'})).toHaveText('2');await focus.focus();await focus.press('Enter');await expect(input).toBeFocused();
});
