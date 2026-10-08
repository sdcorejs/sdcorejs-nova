import {test,expect} from '@playwright/test';
test('production routes, skip focus and history preserve hash and loaded assets',async({page,browserName})=>{
 const failed:string[]=[];page.on('requestfailed',r=>failed.push(r.url()));page.on('pageerror',e=>failed.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('./');await expect(page).toHaveURL(/#\/forms$/);await expect(page.getByRole('heading',{level:1})).toHaveText('Thiết lập theo cách của bạn.');
 await page.reload();await expect(page.getByRole('heading',{level:1})).toBeVisible();
 // WebKit on Windows follows the host full-keyboard-access preference for
 // links; focus the semantic link explicitly there, then verify Enter/focus
 // and route preservation. Full manual keyboard acceptance stays pending.
 if(browserName==='webkit')await page.getByRole('link',{name:'Đến nội dung chính'}).focus();else await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Đến nội dung chính'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('main')).toBeFocused();await expect(page).toHaveURL(/#\/forms$/);
 await page.goto('./#/missing');await expect(page.getByRole('heading',{name:'Không tìm thấy trang'})).toBeVisible();await expect(page.locator('a[aria-current="page"]')).toHaveCount(0);await page.getByRole('link',{name:'Về Biểu mẫu'}).click();await expect(page).toHaveURL(/#\/forms$/);await expect(page.locator('.showcase-sidebar a[aria-current="page"]')).toHaveText('Biểu mẫu');await page.goBack();await expect(page.getByRole('heading',{name:'Không tìm thấy trang'})).toBeVisible();await page.goForward();await expect(page.getByRole('heading',{level:1})).toHaveText('Thiết lập theo cách của bạn.');expect(failed).toEqual([]);
});

test('compact navigation keeps restrained selected, hover and focus states in both themes',async({page})=>{
 for(const width of [1440,360,390]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
   await page.goto(`./?theme=${theme}#/forms`);
   if(width<900)await page.getByRole('button',{name:'Mở menu'}).click();
   const host=width<900?page.getByRole('dialog'):page.locator('.showcase-sidebar');
   const link=host.getByRole('link',{name:'Biểu mẫu'});
   await page.mouse.move(0,0);
   const metrics=await link.evaluate(el=>{
    const css=getComputedStyle(el),nav=getComputedStyle(el.closest('dialog,aside')??el.parentElement!);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
    function rgb(color:string){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);}
    function luminance(color:number[]){return color.slice(0,3).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i]!,0);}
    const fg=rgb(css.color),bg=rgb(css.backgroundColor),a=luminance(fg),b=luminance(bg);
    return {height:el.getBoundingClientRect().height,padding:css.paddingInlineStart,shadow:css.boxShadow,weight:css.fontWeight,background:css.backgroundColor,backgroundRgb:bg,surface:nav.backgroundColor,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),icon:getComputedStyle(el.querySelector('path')!).stroke,color:css.color};
   });
   if(width>=900){expect(metrics.height).toBeGreaterThanOrEqual(36);expect(metrics.height).toBeLessThanOrEqual(40);}else expect(metrics.height).toBeGreaterThanOrEqual(44);
   expect(metrics.padding).toBe('8px');expect(metrics.shadow).toBe('none');expect(metrics.weight).toBe('400');expect(metrics.background).not.toBe(metrics.surface);expect(metrics.backgroundRgb[3]).toBe(255);expect(Math.max(...metrics.backgroundRgb.slice(0,3))-Math.min(...metrics.backgroundRgb.slice(0,3))).toBeLessThanOrEqual(8);expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);expect(metrics.icon).toBe(metrics.color);await expect(host.locator('.showcase-nav-dot')).toHaveCount(0);
   const rows=await host.locator('.showcase-nav-unavailable').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));for(const height of rows)expect(height).toBeGreaterThanOrEqual(width<900?44:36);
   await link.hover();expect(await link.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(metrics.background);
   await page.mouse.move(0,0);await page.keyboard.press('Tab');await link.focus();await expect(link).toBeFocused();const focus=await link.evaluate(el=>({visible:el.matches(':focus-visible'),width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));expect(focus.visible).toBe(true);expect(focus.width).toBeGreaterThanOrEqual(2);expect(focus.style).toBe('solid');
   if(width<900){await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Mở menu'})).toBeFocused();}
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto('./#/missing');const unselected=page.locator('.showcase-sidebar .showcase-nav-active');await expect(unselected).not.toHaveAttribute('aria-current');expect(await unselected.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});
test('backdrop closes and desktop resize restores visible fallback focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./#/forms');const opener=page.getByRole('button',{name:'Mở menu'});await opener.click();const dialog=page.getByRole('dialog',{name:'Khám phá Nova'});await page.mouse.click(375,400);await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
 await opener.click();await page.setViewportSize({width:1440,height:900});await expect(dialog).not.toBeVisible();await expect(page.locator('main')).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});
test('form Save and Reset are local demo interactions',async({page})=>{
 const dataRequests:string[]=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))dataRequests.push(r.url());});await page.goto('./#/forms');
 await page.getByRole('textbox',{name:'Tên hiển thị'}).fill('Minh Nova');await page.getByRole('button',{name:'Lưu bản mẫu',exact:true}).click();await expect(page.getByText('Đã giữ thay đổi trong bản mẫu')).toBeVisible();await expect(page.getByText('Chưa lưu vào tài khoản.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Đặt lại',exact:true}).click();await expect(page.getByRole('textbox',{name:'Tên hiển thị'})).toHaveValue('Nguyễn An');expect(dataRequests).toEqual([]);
});
test('mobile dialog initial focus, wrapping, inert background and Escape restore state',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./#/forms');const opener=page.getByRole('button',{name:'Mở menu'});await opener.click();const dialog=page.getByRole('dialog',{name:'Khám phá Nova'});await expect(dialog).toBeVisible();const close=dialog.getByRole('button',{name:'Đóng menu'});await expect(close).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('link',{name:'Biểu mẫu'})).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 await page.evaluate(()=>document.querySelector<HTMLInputElement>('input')?.focus());await expect(page.getByRole('textbox',{name:'Tên hiển thị'})).not.toBeFocused();await close.focus();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
 await opener.click();await dialog.getByRole('link',{name:'Biểu mẫu'}).click();await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();await expect(page).toHaveURL(/#\/forms$/);
});
test('responsive geometry, dark theme, mobile hit targets and single-line breadcrumb',async({page})=>{
 for(const width of [360,390,1440]){await page.setViewportSize({width,height:900});await page.goto('./#/forms');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const breadcrumb=page.locator('.showcase-breadcrumb');const box=await breadcrumb.boundingBox();expect(box?.height).toBeLessThan(35);if(width<900){const b=await page.getByRole('button',{name:'Mở menu'}).boundingBox();expect(b?.height).toBeGreaterThanOrEqual(44);await page.getByRole('button',{name:'Mở menu'}).click();const link=await page.getByRole('dialog').getByRole('link',{name:'Biểu mẫu'}).boundingBox();expect(link?.height).toBeGreaterThanOrEqual(44);await page.keyboard.press('Escape');}}
 await page.getByRole('button',{name:'Giao diện tối'}).click();await expect(page.getByRole('button',{name:'Giao diện sáng'})).toBeVisible();expect(await page.locator('.showcase').evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
});
