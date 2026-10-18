import { expect,test } from '@playwright/test';
test('F09 calendar month paging, full date labels and Escape return semantic input focus',async({page})=>{
  await page.goto('/?scenario=p1-date-picker');await page.getByRole('button',{name:'Open calendar',exact:true}).first().click();
  const day=page.getByRole('button',{name:'Wednesday, January 31, 2024',exact:true});await day.focus();await page.keyboard.press('PageDown');
  await expect(page.getByRole('button',{name:'Thursday, February 29, 2024',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox',{name:'Date',exact:true})).toHaveValue('02/29/2024');await expect(page.getByRole('textbox',{name:'Date',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Open calendar',exact:true}).first().click();await page.keyboard.press('Escape');await expect(page.getByRole('textbox',{name:'Date',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('status',{name:'Submitted'})).toContainText('2024-02-29');
});
for(const theme of ['light','dark'])test(`F09 320px ${theme} calendar has independent 44px cells without overflow`,async({page},info)=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/?scenario=p1-date-picker');if(theme==='dark')await page.getByRole('button',{name:'Theme',exact:true}).click();
  await page.getByRole('button',{name:'Open calendar',exact:true}).first().click();const grid=page.getByRole('grid');await expect(grid).toBeVisible();
  const geometry=await grid.evaluate(element=>({page:document.documentElement.scrollWidth,rect:element.getBoundingClientRect().toJSON(),cells:[...element.querySelectorAll('td button')].map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}))}));
  expect(geometry.page).toBeLessThanOrEqual(320);expect(geometry.rect.left).toBeGreaterThanOrEqual(0);expect(geometry.rect.right).toBeLessThanOrEqual(320);
  expect(geometry.cells.every(cell=>cell.width>=44&&cell.height>=44)).toBe(true);await page.screenshot({path:info.outputPath(`calendar-${theme}.png`)});
});
