import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {expect,test} from '@playwright/test';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),servers:ChildProcess[]=[],origins:Record<string,string>={};
async function port():Promise<number>{return new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const {port}=probe.address() as {port:number};probe.close(()=>resolve(port));});});}
test.beforeAll(async()=>{for(const fixture of ['vite-csr','next-ssr']){const n=await port(),dir=path.join(ROOT,'fixtures',fixture),args=fixture==='vite-csr'?[path.join(dir,'server.mjs'),String(n)]:[path.join(dir,'run-next.mjs'),'start','-p',String(n),'-H','127.0.0.1'];const server=spawn(process.execPath,args,{cwd:dir,stdio:'ignore'});servers.push(server);origins[fixture]='http://127.0.0.1:'+n;let ready=false;for(let i=0;i<120;i++){try{if((await fetch(origins[fixture]!)).ok){ready=true;break;}}catch{/* startup */}await new Promise(resolve=>setTimeout(resolve,250));}if(!ready)throw Error('Fixture not ready '+fixture);}});
test.afterAll(()=>{for(const server of servers)server.kill();});

for(const fixture of ['vite-csr','next-ssr'])test(fixture+' packed P2 public root/subpaths hydrate and preserve raw keys, canonical color and stored state',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/report[\s-]only/iu.test(m.text()))errors.push(m.text());});
 await page.goto(origins[fixture]+(fixture==='next-ssr'?'/p2':'/'));await expect(page.getByTestId('p2-content')).toHaveCount(0);await page.getByRole('button',{name:'Open P2 consumer',exact:true}).click();
 await expect(page.getByTestId('p2-content')).toBeVisible();const color=page.getByRole('textbox',{name:'P2 color',exact:true});await color.fill('#ff00aa');await color.press('Tab');await expect(page.getByTestId('p2-color')).toHaveText('#FF00AA');
 const table=page.getByRole('table',{name:'P2 records'});await table.getByRole('checkbox').nth(1).click();await expect(page.getByTestId('p2-selection')).toHaveText('[0]');await table.getByRole('checkbox').nth(2).click();await expect(page.getByTestId('p2-selection')).toHaveText('[0,"0"]');
 await page.getByRole('button',{name:'P2 increment stored',exact:true}).click();await expect(page.getByTestId('p2-stored')).toHaveText('1');
 await expect(page.getByTestId('p2-query')).toHaveText(JSON.stringify({kind:'rule',field:'count',operator:'eq',operand:{kind:'literal',value:0}}));await expect(page.getByRole('tree',{name:'P2 tree'})).toBeVisible();expect(errors).toEqual([]);
});
test('Next packed pure query renders in RSC before JavaScript with false preserved and UI IDs stripped',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});try{const page=await context.newPage();await page.goto(origins['next-ssr']+'/p2');await expect(page.getByRole('heading',{name:'P2 packed server consumer'})).toBeVisible();await expect(page.getByTestId('p2-server-query')).toHaveText(JSON.stringify({kind:'rule',field:'enabled',operator:'eq',operand:{kind:'literal',value:false}}));await expect(page.getByTestId('p2-content')).toHaveCount(0);}finally{await context.close();}});

import type {Page} from '@playwright/test';
async function packedAcceptance(page:Page,fixture:string,section:string){
 await page.goto(origins[fixture]+(fixture==='next-ssr'?'/p2':'/'));
 await expect(page.getByRole('button',{name:'Open packed acceptance',exact:true})).toBeVisible({timeout:3000});
 await page.getByRole('button',{name:'Open packed acceptance',exact:true}).click();
 await page.getByRole('button',{name:'Show '+section,exact:true}).click();
}

for(const fixture of ['vite-csr','next-ssr']){
 test('case-p2-d01-ac05-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'table');const table=page.getByRole('table',{name:'Acceptance records'});
  const sort=table.getByRole('button',{name:'Title',exact:true});await sort.focus();await sort.press('Enter');await expect(table.getByRole('columnheader',{name:'Title'})).toHaveAttribute('aria-sort','ascending');await sort.press('Space');await expect(table.getByRole('columnheader',{name:'Title'})).toHaveAttribute('aria-sort','descending');
  const select=table.getByRole('checkbox',{name:'Select row 1',exact:true});await select.focus();await select.press('Space');await expect(select).toBeChecked();await expect(page.getByTestId('accept-table-state')).toContainText('"selectedKeys":[0]');
  await table.getByRole('button',{name:'Expand row 1',exact:true}).click();await page.getByRole('button',{name:'Close detail Zero',exact:true}).click();await expect(table.getByRole('button',{name:'Expand row 1',exact:true})).toBeFocused();
  await page.setViewportSize({width:320,height:740});const mobile=page.getByRole('group',{name:'Acceptance records',exact:true});await expect(mobile).toBeVisible();await expect(mobile.getByRole('listitem')).toHaveCount(2);await expect(mobile).toContainText('Zero');await expect(mobile).toContainText('String zero');await expect(mobile.getByRole('checkbox',{name:'Select row 1',exact:true})).toBeChecked();
 });
 test('case-p2-d03-ac01-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'query');await page.getByRole('button',{name:'Serialize packed query',exact:true}).click();const serialized=await page.getByTestId('accept-query').textContent();const parsed=JSON.parse(serialized!);
  expect(parsed).toEqual({kind:'group',logic:'and',children:[{kind:'rule',field:'count',operator:'eq',operand:{kind:'literal',value:0}},{kind:'rule',field:'enabled',operator:'eq',operand:{kind:'literal',value:false}}]});expect(serialized).not.toContain('ui-');expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
 });
 test('case-p2-f11-ac03-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'calendar');for(const locale of ['en','vi']){await page.getByRole('button',{name:'Calendar '+locale,exact:true}).click();const date=new Intl.DateTimeFormat(locale,{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date('2024-01-31T00:00:00Z'));const remove=(locale==='vi'?'Xóa thẻ ':'Remove ')+date;
   await expect(page.getByRole('button',{name:remove,exact:true})).toBeVisible();await page.getByRole('region',{name:'Packed acceptance',exact:true}).getByRole('button',{name:locale==='vi'?'Mở lịch':'Open calendar',exact:true}).click();const day=page.getByRole('button',{name:date,exact:true});await expect(day.locator('..')).toHaveAttribute('aria-selected','true');await day.focus();await day.press('ArrowLeft');await page.keyboard.press('Enter');await expect(page.getByTestId('accept-calendar-value')).toHaveText('["2024-01-30","2024-01-31"]');await page.keyboard.press('Escape');await expect(page.locator('.nova-calendar-chips__popup')).toBeHidden();await page.getByRole('button',{name:remove,exact:true}).focus();await expect(page.getByRole('button',{name:remove,exact:true})).toBeFocused();await page.getByRole('button',{name:remove,exact:true}).press('Delete');await expect(page.getByRole('textbox',{name:'Acceptance dates',exact:true})).toBeFocused();await expect(page.getByTestId('accept-calendar-value')).toHaveText('["2024-01-30"]');}
 });
 test('case-p2-s06-ac04-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'task');await expect(page.getByTestId('accept-task-counts')).toHaveText('1/0');await expect(page.getByTestId('accept-task-state')).toHaveCount(2);await page.getByRole('button',{name:'Remove first subscriber',exact:true}).click();await expect(page.getByTestId('accept-task-counts')).toHaveText('1/0');await page.getByRole('button',{name:'Remove last subscriber',exact:true}).click();await expect(page.getByTestId('accept-task-counts')).toHaveText('0/1');await page.getByRole('button',{name:'Remount strict subscribers',exact:true}).click();await expect(page.getByTestId('accept-task-counts')).toHaveText('1/1');await page.getByRole('button',{name:'Emit retained stale event',exact:true}).click();await expect(page.getByTestId('accept-task-state')).toHaveText(['running','running']);await page.getByRole('button',{name:'Remove first subscriber',exact:true}).click();await page.getByRole('button',{name:'Remove last subscriber',exact:true}).click();await expect(page.getByTestId('accept-task-counts')).toHaveText('0/2');
 });
 test('case-p2-s09-ac04-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'storage');await page.getByRole('button',{name:'Early set zero',exact:true}).click();await page.getByRole('button',{name:'Release old read',exact:true}).click();await expect(page.getByTestId('accept-stored')).toHaveText('0');await page.getByRole('button',{name:'Begin reset read',exact:true}).click();await page.getByRole('button',{name:'Queue then reset',exact:true}).click();await page.getByRole('button',{name:'Release started write',exact:true}).click();await expect(page.getByTestId('accept-stored')).toHaveText('1');await expect(page.getByTestId('accept-storage-memory')).toHaveText('absent');await page.getByRole('button',{name:'Release old read',exact:true}).click();await expect(page.getByTestId('accept-storage-memory')).toHaveText('absent');await page.getByRole('button',{name:'Load version one envelope',exact:true}).click();await expect(page.getByTestId('accept-migrated')).toHaveText('8/1');await expect(page.getByTestId('accept-storage-counts')).toHaveText('1/1');
 });
 test('case-p2-u01-ac04-packed '+fixture,async({page})=>{
  await page.addInitScript(()=>{const original=URL.revokeObjectURL;const originalCreate=URL.createObjectURL;Object.assign(window,{__acceptCallerRevokes:0,__acceptCallerCreates:0});URL.createObjectURL=function(blob){Object.assign(window,{__acceptCallerCreates:(window as unknown as {__acceptCallerCreates:number}).__acceptCallerCreates+1});return originalCreate.call(URL,blob);};URL.revokeObjectURL=function(url){Object.assign(window,{__acceptCallerRevokes:(window as unknown as {__acceptCallerRevokes:number}).__acceptCallerRevokes+1});return original.call(URL,url);};});await packedAcceptance(page,fixture,'transfer');await page.getByRole('button',{name:'Receive Blob',exact:true}).click();await expect(page.getByTestId('accept-transfer-result')).toHaveText('Blob:packed bytes');await expect(page.getByTestId('accept-transfer-outcomes')).toContainText('blob');await page.getByRole('button',{name:'Receive handoff',exact:true}).click();await expect(page.getByTestId('accept-transfer-result')).toHaveText('void');await expect(page.getByTestId('accept-transfer-outcomes')).toContainText('browser-handoff');await page.getByRole('button',{name:'Missing download adapter',exact:true}).click();await expect(page.getByTestId('accept-transfer-error')).toHaveText('A download adapter is required.');const callerURL=await page.getByTestId('accept-caller-url').textContent();expect(callerURL).toMatch(/^blob:/);await page.getByRole('button',{name:'Unmount transfer',exact:true}).click();await expect(page.getByTestId('accept-caller-url-revokes')).toHaveText('0');expect(await page.evaluate(()=>(window as unknown as {__acceptCallerCreates:number}).__acceptCallerCreates)).toBe(1);await page.evaluate(url=>URL.revokeObjectURL(url!),callerURL);
 });
 test('case-p2-u02-ac03-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'import');const input=page.getByLabel('Choose files',{exact:true});await input.setInputFiles({name:'old.csv',mimeType:'text/csv',buffer:Buffer.from('old')});await input.setInputFiles({name:'current.csv',mimeType:'text/csv',buffer:Buffer.from('current')});await page.getByRole('button',{name:'Release old file',exact:true}).click();await expect(page.getByText('Workbook ready.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Source column for Name',{exact:true}).selectOption('0');await page.getByLabel('Source column for Count',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Validating rows…',{exact:true})).toBeVisible();await page.getByLabel('Worksheet',{exact:true}).selectOption('1');await page.getByLabel('Source column for Name',{exact:true}).selectOption('0');await page.getByLabel('Source column for Count',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Release stale mapping',exact:true}).click();await expect(page.getByRole('region',{name:'Import review',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('region',{name:'Import review',exact:true})).toContainText('Current second');await expect(page.getByRole('region',{name:'Import review',exact:true})).not.toContainText('Old row');await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Import',exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});await expect(page.getByTestId('accept-commit-count')).toHaveText('1');await page.getByRole('button',{name:'Reject partial row',exact:true}).click();await expect(page.getByRole('region',{name:'Import review',exact:true})).toContainText('Current second');await expect(page.getByRole('link',{name:/Server rejected source cell/})).toBeVisible();await expect(page.getByTestId('accept-import-cancel')).toHaveText('true/true');await page.getByRole('link',{name:/Server rejected source cell/}).click();await expect(page.locator('[id$="cell-2-count"]')).toBeFocused();
 });
 test('case-p2-u03-ac02-packed '+fixture,async({page})=>{
  await packedAcceptance(page,fixture,'pdf');await expect(page.getByRole('button',{name:'Previous page',exact:true})).toBeDisabled();await expect(page.getByLabel('Page',{exact:true})).toHaveText('1 / 2');await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.getByLabel('Page',{exact:true})).toHaveText('2 / 2');await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Load slow PDF',exact:true}).click();await page.getByRole('button',{name:'Replace PDF source',exact:true}).click();await page.getByRole('button',{name:'Release stale PDF render',exact:true}).click();await expect(page.getByTestId('accept-pdf-stats')).toContainText('slow:1:aborted');await expect(page.getByText('replacement readable page 1',{exact:true})).toBeVisible();await expect(page.getByText('slow readable page 1',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Unmount PDF',exact:true}).click();await expect(page.getByTestId('accept-pdf-stats')).toContainText('replacement:1');await expect(page.getByTestId('accept-pdf-stats')).toHaveText('initial:1:aborted,slow:1:aborted,replacement:1:aborted');
 });
}

// AC042: the packed hook owns the requested image URL; inherited img-src deliberately blocks blob previews.
type OwnedPreviewProbe={created:string[];revoked:string[];violations:Array<{directive:string;blocked:string;disposition:string}>};
const packedImage=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==','base64');
async function ownedPreview(page:Page,fixture:string){
 await page.addInitScript(()=>{
  const probe:OwnedPreviewProbe={created:[],revoked:[],violations:[]};Object.assign(window,{__ownedPreviewProbe:probe});
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=function(blob){const url=create.call(URL,blob);probe.created.push(url);return url;};
  URL.revokeObjectURL=function(url){probe.revoked.push(url);return revoke.call(URL,url);};
  document.addEventListener('securitypolicyviolation',event=>probe.violations.push({directive:event.effectiveDirective,blocked:event.blockedURI,disposition:event.disposition}));
 });
 await packedAcceptance(page,fixture,'transfer');
 // Validate the raw PNG independently through the permitted data: scheme; the hook-returned blob URL is tested below as a CSP failure.
 expect(await page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};},packedImage.toString('base64'))).toEqual({width:1,height:1});
 await expect(page.getByRole('button',{name:'Request owned image preview',exact:true})).toBeVisible({timeout:3000});
 await page.getByLabel('Enroll packed preview image',{exact:true}).setInputFiles({name:'packed-preview.png',mimeType:'image/png',buffer:packedImage});
 await expect(page.getByTestId('owned-preview-attempt')).toHaveText(/^transfer-/);
}
async function previewProbe(page:Page){return page.evaluate(()=>(window as unknown as {__ownedPreviewProbe:OwnedPreviewProbe}).__ownedPreviewProbe);}
for(const fixture of ['vite-csr','next-ssr']){
 for(const cleanup of ['clear','unmount'])test('case-p2-u01-ac04-owned-preview '+cleanup+' '+fixture,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await ownedPreview(page,fixture);const attemptID=await page.getByTestId('owned-preview-attempt').textContent();
  await page.getByRole('button',{name:'Prepare caller image download',exact:true}).click();
  const callerURL=await page.getByRole('link',{name:'Download caller image',exact:true}).getAttribute('href');expect(callerURL).toMatch(/^blob:/);
  await page.getByRole('button',{name:'Request owned image preview',exact:true}).click();
  const actual=page.getByRole('img',{name:'Actual transfer preview',exact:true});await expect(actual).toHaveAttribute('src',/^blob:/);
  const ownedURL=await actual.getAttribute('src');expect(ownedURL).not.toBe(callerURL);
  await expect(page.getByTestId('owned-preview-url')).toHaveText(ownedURL!);
  await expect(page.getByRole('status',{name:'Owned image preview feedback',exact:true})).toHaveText('This image preview was blocked or could not load.');
  expect(await actual.evaluate(img=>({complete:(img as HTMLImageElement).complete,width:(img as HTMLImageElement).naturalWidth}))).toEqual({complete:true,width:0});
  await expect.poll(async()=>(await previewProbe(page)).violations.some(v=>v.directive==='img-src'&&v.blocked==='blob'&&v.disposition==='enforce')).toBe(true);
  await page.getByRole('button',{name:'Request owned image preview',exact:true}).click();await expect(page.getByTestId('owned-preview-settlements')).toHaveText('2');
  expect((await previewProbe(page)).created).toEqual([callerURL,ownedURL]);expect((await previewProbe(page)).revoked).toEqual([]);
  await page.getByRole('button',{name:cleanup==='clear'?'Clear owned image attempts':'Unmount owned image transfer',exact:true}).click();
  await page.getByRole('button',{name:'Repeat retained image cleanup',exact:true}).click();
  await page.getByRole('button',{name:'Request retained old image preview',exact:true}).click();
  await expect(page.getByTestId('owned-retained-result')).toHaveText('unavailable');await expect(page.getByTestId('owned-retained-attempt')).toHaveText(attemptID!);
  await expect(page.getByRole('img',{name:'Actual transfer preview',exact:true})).toHaveCount(0);
  expect((await previewProbe(page)).revoked).toEqual([ownedURL]);expect((await previewProbe(page)).created).toEqual([callerURL,ownedURL]);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download caller image',exact:true}).click()]);expect(download.suggestedFilename()).toBe('packed-preview.png');const {readFile}=await import('node:fs/promises');expect(await readFile((await download.path())!)).toEqual(packedImage);
  expect(errors).toEqual([]);await page.evaluate(url=>URL.revokeObjectURL(url!),callerURL);
 });
 for(const cleanup of ['clear','unmount'])test('case-p2-u01-ac04-pending-preview '+cleanup+' '+fixture,async({page})=>{
  await ownedPreview(page,fixture);const attemptID=await page.getByTestId('owned-preview-attempt').textContent();await page.getByRole('button',{name:cleanup==='clear'?'Request image preview then clear':'Request image preview then unmount',exact:true}).click();
  await expect(page.getByTestId('owned-pending-result')).toHaveText('unavailable');
  await page.getByRole('button',{name:'Repeat retained image cleanup',exact:true}).click();
  await page.getByRole('button',{name:'Request retained old image preview',exact:true}).click();await expect(page.getByTestId('owned-retained-result')).toHaveText('unavailable');await expect(page.getByTestId('owned-retained-attempt')).toHaveText(attemptID!);
  expect((await previewProbe(page)).created).toEqual([]);expect((await previewProbe(page)).revoked).toEqual([]);
  await expect(page.getByRole('img',{name:'Actual transfer preview',exact:true})).toHaveCount(0);
 });
}
