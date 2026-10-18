import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect,test,type Page} from '@playwright/test';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const servers:ChildProcess[]=[];
const origins:Record<string,string>={};
async function freePort():Promise<number>{return new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const {port}=probe.address() as {port:number};probe.close(()=>resolve(port));});});}
test.beforeAll(async()=>{
 for(const fixture of ['vite-csr','next-ssr']){
  const port=await freePort(),dir=path.join(ROOT,'fixtures',fixture);
  const args=fixture==='vite-csr'?[path.join(dir,'server.mjs'),String(port)]:[path.join(dir,'run-next.mjs'),'start','-p',String(port),'-H','127.0.0.1'];
  const server=spawn(process.execPath,args,{cwd:dir,stdio:'ignore'});servers.push(server);origins[fixture]='http://127.0.0.1:'+port;
  let ready=false;
  for(let attempt=0;attempt<120;attempt++){try{if((await fetch(origins[fixture]!)).ok){ready=true;break;}}catch{/* startup */}await new Promise(resolve=>setTimeout(resolve,250));}
  if(!ready)throw Error(fixture+' did not become ready');
 }
});
test.afterAll(()=>{for(const server of servers)server.kill();});
async function open(page:Page,fixture:string){
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/report[\s-]only/iu.test(m.text()))errors.push(m.text());});
 await page.goto(origins[fixture]!);if(fixture==='next-ssr')await expect(page.getByTestId('hydrated')).toHaveAttribute('data-hydrated','true');await expect(page.getByRole('form',{name:'P1 native'})).toBeVisible();
 return errors;
}
for(const fixture of ['vite-csr','next-ssr'])test.describe(fixture+' packed P1',()=>{
 test('native fields preserve civil dates, midnight, zero and repeated values',async({page})=>{
  const errors=await open(page,fixture);await page.getByRole('button',{name:'P1 submit native'}).click();
  await expect(page.getByTestId('p1-native')).toHaveText(JSON.stringify([['civil','2024-02-29'],['clock','00:00'],['amount','0'],['choice','n:0'],['many','n:0'],['many','n:1'],['tags','Đặng'],['tags','Nova']]));
  const time=page.getByRole('textbox',{name:'P1 time'});await time.fill('   ');await time.press('Tab');
  expect(await time.evaluate(el=>(el as HTMLInputElement).validity.valueMissing)).toBe(true);
  await page.getByRole('button',{name:'P1 submit native'}).click();await expect(time).toBeFocused();
  expect(errors).toEqual([]);
 });
 test('RHF adapter focuses visible invalid control and returns raw value types',async({page})=>{
  const errors=await open(page,fixture);await page.getByRole('button',{name:'P1 submit controller'}).click();
  const name=page.getByRole('textbox',{name:'P1 name'});await expect(name).toBeFocused();await expect(name).toHaveAttribute('aria-invalid','true');
  await name.fill('Đặng An');await page.getByRole('checkbox',{name:'P1 flag'}).click();await page.getByRole('button',{name:'P1 submit controller'}).click();
  await expect(page.getByTestId('p1-controller')).toHaveText(JSON.stringify({name:'Đặng An',flag:true}));expect(errors).toEqual([]);
 });
 test('Temporal rejects DST gap and InlineEdit closes only after consumer acknowledgement',async({page})=>{
  const errors=await open(page,fixture);const group=page.getByRole('group',{name:'P1 instant'}),time=group.getByRole('textbox',{name:'Giờ',exact:true});
  await expect(time).toHaveValue('01:30:00');await time.fill('02:30:00');await time.press('Tab');await expect(group.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Chỉnh sửa P1 title'}).click();await page.getByRole('textbox',{name:'P1 draft'}).fill('Đặng updated');await page.getByRole('button',{name:'Lưu',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'P1 draft'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Chỉnh sửa P1 title'})).toContainText('Đặng updated');expect(errors).toEqual([]);
 });
 test('sidebar hydration retains its live draft across desktop/mobile ownership changes',async({page})=>{
  const errors=await open(page,fixture);const input=page.getByRole('textbox',{name:'P1 sidebar draft'});await expect(input).toHaveValue('Server draft');await input.fill('Đặng local');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'P1 menu'}).click();
  const drawer=page.getByRole('dialog',{name:'P1 workspace'});await expect(drawer.getByRole('textbox',{name:'P1 sidebar draft'})).toHaveValue('Đặng local');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'P1 menu'})).toBeFocused();
  await page.setViewportSize({width:1280,height:800});await expect(input).toHaveValue('Đặng local');await input.fill('Still editable');await expect(input).toHaveValue('Still editable');expect(errors).toEqual([]);
 });
});
test('Next streams P1 server-compatible content and sidebar before JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(origins['next-ssr']!);
 await expect(page.locator('dl').filter({has:page.locator('dt',{hasText:'P1 server zero'})}).locator('dd')).toHaveText('0');await expect(page.getByRole('textbox',{name:'P1 sidebar draft',includeHidden:true})).toHaveValue('Server draft');await expect(page.locator('mark').filter({hasText:'Đặng'})).toBeVisible();await context.close();
});
