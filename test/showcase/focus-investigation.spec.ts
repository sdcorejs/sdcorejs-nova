// INVESTIGATION ONLY (never merge): replays showcase test "backdrop closes and
// desktop resize restores visible fallback focus" and records where focus goes
// on Linux CI. The Dialog build on this branch reports its return-focus
// decision through window.__NOVA_FOCUS_DEBUG__.
import {expect,test} from '@playwright/test';

test('focus investigation: desktop resize returns drawer focus to main',async({page},testInfo)=>{
 await page.addInitScript(()=>{
  const w=window as unknown as {__log:string[];__NOVA_FOCUS_DEBUG__:(entry:Record<string,unknown>)=>void};w.__log=[];const t0=performance.now();
  const label=(node:unknown)=>node instanceof Element?node.tagName.toLowerCase()+(node.id?'#'+node.id:'')+'['+(node.getAttribute('aria-label')??node.textContent??'').slice(0,16)+']'+(node.isConnected?'':'(detached)')+(node.closest('[role=dialog]')?'(in-dialog)':''):String(node);
  const stamp=()=>Math.round(performance.now()-t0);
  w.__NOVA_FOCUS_DEBUG__=entry=>w.__log.push(stamp()+' DEBUG '+JSON.stringify(entry));
  for(const type of ['focusin','focusout'])document.addEventListener(type,event=>w.__log.push(stamp()+' '+type+' '+label(event.target)+' dialogs='+document.querySelectorAll('[role=dialog]').length),true);
  window.addEventListener('resize',()=>w.__log.push(stamp()+' resize '+innerWidth+' active='+label(document.activeElement)));
 });
 await page.setViewportSize({width:390,height:844});await page.goto('./#/forms');
 const opener=page.getByRole('button',{name:'Mở menu'}),dialog=page.getByRole('dialog',{name:'Khám phá Nova'});
 await opener.click();await page.mouse.click(375,400);await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();
 await opener.click();await page.setViewportSize({width:1440,height:900});await expect(dialog).not.toBeVisible();
 let focused=false;
 for(let i=0;i<50&&!focused;i++){focused=await page.evaluate(()=>document.activeElement===document.querySelector('main'));if(!focused)await page.waitForTimeout(100);}
 const log=await page.evaluate(()=>{const w=window as unknown as {__log:string[]};const a=document.activeElement;w.__log.push('final active='+(a?a.tagName.toLowerCase()+'#'+a.id+'['+(a.getAttribute('aria-label')??a.textContent??'').slice(0,16)+']':'null'));return w.__log;});
 await testInfo.attach('focus-log',{body:log.join('\n'),contentType:'text/plain'});
 console.log((focused?'PASS':'FAIL')+' repeat '+testInfo.repeatEachIndex+'\n'+log.slice(-24).join('\n'));
 expect(focused,'main should be focused after the desktop resize').toBe(true);
});
