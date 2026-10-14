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
