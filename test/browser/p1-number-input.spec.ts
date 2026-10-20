import {expect,test} from '@playwright/test';
test('F03 locale draft submits finite canonical value, wheel stays unchanged and reset survives parent update',async({page})=>{await page.goto('/?scenario=p1-number-input');const input=page.getByRole('textbox',{name:'Amount'});await input.fill('1.234,5');await input.focus();await page.mouse.wheel(0,120);await expect(input).toHaveValue('1.234,5');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('status',{name:'Payload'})).toHaveText('1234.5');await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(input).toHaveValue('0');});
// Round 2: [input][−][+] inside one control frame; steppers 32 wide desktop, ≥ 44×44 coarse, full control height, SVG icons.
for(const [width,stepWidth,height] of [[1280,32,36],[320,44,44]] as const)test(`F03 steppers sit inside the ${height}px control frame at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.goto('/?scenario=p1-number-input');
 const frame=await page.locator('.nova-number-input').boundingBox(),input=await page.getByRole('textbox',{name:'Amount'}).boundingBox();
 expect(frame!.height).toBeCloseTo(height,0);expect(input!.height).toBeGreaterThanOrEqual(height-0.5);
 for(const name of ['Decrease','Increase']){const step=page.getByRole('button',{name,exact:true}),box=(await step.boundingBox())!;
  expect(box.width).toBeCloseTo(stepWidth,0);expect(box.height).toBeGreaterThanOrEqual(height-0.5);
  expect(box.x).toBeGreaterThanOrEqual(input!.x+input!.width-0.5);expect(box.x+box.width).toBeLessThanOrEqual(frame!.x+frame!.width+0.5);
  expect(box.y).toBeGreaterThanOrEqual(frame!.y-0.5);expect(box.y+box.height).toBeLessThanOrEqual(frame!.y+frame!.height+0.5);
  await expect(step).toHaveText('');await expect(step.locator('svg[aria-hidden="true"]')).toHaveCount(1);}
});
