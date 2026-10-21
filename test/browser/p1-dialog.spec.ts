import { expect, test } from '@playwright/test';

test('dialog above popover wins actual overlapping pixels and returns focus without closing its parent',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto('/?scenario=p1-dialog');await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Open tools'}).click();const parent=page.getByRole('dialog',{name:'Parent tools'});await expect(parent).toBeVisible();await page.getByRole('button',{name:'Open dialog'}).click();const child=page.getByRole('dialog',{name:'Child dialog'});await expect(child).toBeVisible();
  const winsOverlap=await child.evaluate(element=>{
    const other=document.querySelector('[aria-label="Parent tools"]')!;const a=element.getBoundingClientRect(),b=other.getBoundingClientRect();const left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),top=Math.max(a.top,b.top),bottom=Math.min(a.bottom,b.bottom);
    if(right<=left || bottom<=top)return {overlap:false,childWins:false};const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);return {overlap:true,childWins:hit!==null && element.contains(hit)};
  });expect(winsOverlap).toEqual({overlap:true,childWins:true});
  const action=child.getByRole('button',{name:'Child action'});
  await action.click();await expect(child.getByRole('status',{name:'Child actions'})).toHaveText('1');
  // WebKit follows native mouse focus policy; verify keyboard activation/focus explicitly.
  await action.focus();await action.press('Enter');await expect(child.getByRole('status',{name:'Child actions'})).toHaveText('2');await expect(action).toBeFocused();await child.getByRole('button',{name:'Close',exact:true}).click();await expect(child).toHaveCount(0);await expect(parent).toBeVisible();await expect(page.getByRole('button',{name:'Open dialog'})).toBeFocused();
});

for (const [trigger,source] of [['Filters','an explicit return ref'],['Sort','the opener']]) {
  test(`focus moved outside while a sheet exits is not pulled back to ${source}`,async({page})=>{
    await page.goto('/?scenario=p1-dialog-focus-return');await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
    const open=page.getByRole('button',{name:trigger,exact:true}),next=page.getByRole('button',{name:'Next chip'}),sheet=page.getByRole('dialog');
    // Control: an untouched keyboard close still returns focus.
    await open.focus();await open.press('Enter');await expect(sheet.getByRole('textbox',{name:'Draft'})).toBeFocused();await page.keyboard.press('Escape');await expect(sheet).toHaveCount(0);await expect(open).toBeFocused();
    await open.press('Enter');await expect(sheet.getByRole('textbox',{name:'Draft'})).toBeFocused();await page.keyboard.press('Escape');
    // The app moves focus while the closed sheet is still mounted.
    const moved=await page.evaluate(()=>{
      const popup=document.querySelector('[role="dialog"]'),chip=[...document.querySelectorAll('button')].find(button=>button.textContent==='Next chip')!;chip.focus();
      return {mounted:popup?.isConnected===true,closed:popup?.hasAttribute('data-closed')===true,focused:document.activeElement===chip};
    });
    expect(moved).toEqual({mounted:true,closed:true,focused:true});
    await expect(sheet).toHaveCount(0);await expect(next).toBeFocused();
  });
}

test('design r2 dialog close is a 32 icon button on desktop and a 44 target when narrow',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto('/?scenario=p1-dialog');await expect(page.locator('body[data-harness="ready"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Open tools'}).click();await page.getByRole('button',{name:'Open dialog'}).click();const child=page.getByRole('dialog',{name:'Child dialog'}),close=child.getByRole('button',{name:'Close',exact:true});
  let box=(await close.boundingBox())!;expect(await close.textContent()).toBe('');expect(Math.round(box.width)).toBe(32);expect(Math.round(box.height)).toBe(32);
  await page.setViewportSize({width:320,height:740});box=(await close.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  const bounds=(await child.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(320);expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width);
});
