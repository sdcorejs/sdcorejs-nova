// P2 additive public package, CSS, isolation and bounded D002 contracts.
import {readFileSync,existsSync,mkdirSync,mkdtempSync,writeFileSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const P2_SUBPATHS=["./adapters/storage","./calendar-chips","./color-input","./data-table","./entity-picker","./file-explorer","./file-upload","./image-preview","./import-wizard","./job-progress","./pdf-preview","./query-bar","./query-builder","./resizable-dialog","./splitter","./tree-select","./tree","./file-transfer","./stored-state","./task","./task-provider","./query"];
export const P2_RUNTIME_NAMES=["CalendarChips","ColorInput","DataTable","TablePagination","EntityPicker","FileExplorer","FileUpload","ImagePreview","ImportWizard","JobProgress","PdfPreview","QueryBar","FilterPanel","QueryBuilder","ResizableDialog","Splitter","TreeSelect","Tree","TreeItem","useFileTransfer","useStoredState","useTask","TaskProvider","serializeQuery"];
export const P2_COMPONENTS=["calendar-chips","color-input","data-table","entity-picker","file-explorer","file-upload","image-preview","import-wizard","job-progress","pdf-preview","query-bar","query-builder","resizable-dialog","splitter","tree-select","tree"];
export const P2_TARGETS={"./adapters/storage":"./dist/adapters/storage/index.js","./calendar-chips":"./dist/components/calendar-chips/index.js","./color-input":"./dist/components/color-input/index.js","./data-table":"./dist/components/data-table/index.js","./entity-picker":"./dist/components/entity-picker/index.js","./file-explorer":"./dist/components/file-explorer/index.js","./file-upload":"./dist/components/file-upload/index.js","./image-preview":"./dist/components/image-preview/index.js","./import-wizard":"./dist/components/import-wizard/index.js","./job-progress":"./dist/components/job-progress/index.js","./pdf-preview":"./dist/components/pdf-preview/index.js","./query-bar":"./dist/components/query-bar/index.js","./query-builder":"./dist/components/query-builder/index.js","./resizable-dialog":"./dist/components/resizable-dialog/index.js","./splitter":"./dist/components/splitter/index.js","./tree-select":"./dist/components/tree-select/index.js","./tree":"./dist/components/tree/index.js","./file-transfer":"./dist/hooks/file-transfer/index.js","./stored-state":"./dist/hooks/stored-state/index.js","./task":"./dist/hooks/task/index.js","./task-provider":"./dist/providers/task/index.js","./query":"./dist/query/index.js"};

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const digest=bytes=>'sha256:v1:'+createHash('sha256').update(bytes).digest('hex');
const read=file=>readFileSync(file,'utf8');
const imports=code=>[...code.matchAll(/(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gu)].map(m=>m[1]??m[2]??m[3]);
export function moduleClosure(root,entry,seen=new Set()){
 const file=path.resolve(root,entry);if(seen.has(file))return [];seen.add(file);
 if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Module leaves installed package');
 const code=read(file);return [{file,code},...imports(code).flatMap(specifier=>specifier.startsWith('.')?moduleClosure(root,path.relative(root,path.resolve(path.dirname(file),specifier)),seen):[{specifier}])];
}
export function isApprovedGeometry(selector,property,value,bounds){
 if(typeof value!=='string')return false;
 const match=/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(%|px)$/u.exec(value);
 if(!match)return false;const number=Number(match[1]);if(!Number.isFinite(number))return false;
 if(selector==='.nova-splitter__panel')return property==='flex-basis'&&match[2]==='%'&&number>=0&&number<=100;
 if(selector!=='.nova-resizable-dialog'||!['width','height'].includes(property)||match[2]!=='px'||number<=0)return false;
 const maximum=property==='width'?bounds?.width:bounds?.height;
 return Number.isFinite(maximum)&&maximum>0&&number<=maximum;
}
export function additiveShowcaseConfig(config){
 const old=Array.isArray(config.testMatch)?config.testMatch:[config.testMatch];
 return {...config,testMatch:[...new Set([...old,'showcase.spec.ts','p2-showcase.spec.ts'])]};
}
export function checkP2Inventory(root){
 const errors=[],manifest=JSON.parse(read(path.join(root,'package.json')));
 for(const subpath of P2_SUBPATHS){const target=manifest.exports?.[subpath],expected=P2_TARGETS[subpath];
  if(!target||typeof target!=='object'||Object.keys(target).join(',')!=='types,default'||target.default!==expected||target.types!==expected.replace(/\.js$/u,'.d.ts')){errors.push('P2 export target mismatch: '+subpath);continue;}
  for(const file of Object.values(target))if(!existsSync(path.join(root,file)))errors.push('Missing P2 target '+file);
 }
 const cssFile=path.join(root,'dist/styles.css');if(!existsSync(cssFile))errors.push('Missing aggregate styles.css');else for(const component of P2_COMPONENTS)if(!read(cssFile).includes('.nova-'+component))errors.push('Aggregate CSS missing '+component);
 return errors;
}
export async function checkP2Contracts(root=ROOT){
 const errors=checkP2Inventory(root);if(errors.length)return errors;
 const api=await import(pathToFileURL(path.join(root,'dist/index.js')).href);
 for(const name of P2_RUNTIME_NAMES)if(typeof api[name]!=='function')errors.push('Missing P2 root runtime '+name);
 if('createLocalStorageAdapter' in api)errors.push('Storage factory must stay subpath-only');
 for(const subpath of P2_SUBPATHS){const modules=moduleClosure(root,P2_TARGETS[subpath]);
  for(const module of modules){if(module.specifier&&/^(?:pdfjs-dist|xlsx|exceljs|@tanstack\/|react-hook-form|@js-temporal\/)/u.test(module.specifier))errors.push(subpath+' imports engine '+module.specifier);
   if(subpath==='./query'&&(module.specifier||/[\/]components[\/]|[\/]providers[\/]|\b(?:window|document|localStorage)\b/u.test(module.file+' '+module.code)))errors.push('Pure query closure includes UI/browser/runtime dependency');
  }
 }
 const storage=await import(pathToFileURL(path.join(root,P2_TARGETS['./adapters/storage'])).href);const adapter=storage.createLocalStorageAdapter();
 for(const method of ['read','write','remove'])if(typeof adapter[method]!=='function')errors.push('Storage adapter missing '+method);
 return errors;
}
export function installedPackageRoot(consumer){
 const require=createRequire(path.join(consumer,'package.json'));
 const installed=path.resolve(path.dirname(require.resolve('@sdcorejs/nova')),'..');
 const expected=path.resolve(consumer,'node_modules/@sdcorejs/nova');
 if(realpathSync(installed)!==realpathSync(expected)||!realpathSync(installed).startsWith(realpathSync(consumer)+path.sep))throw Error('P2 proof must resolve an installed tarball, not checkout self-reference');
 return installed;
}
export async function verifyInstalledP2(consumer,output){
 const installed=installedPackageRoot(consumer),errors=await checkP2Contracts(installed);if(errors.length)throw Error(errors.join('\n'));
 const require=createRequire(path.join(consumer,'package.json'));for(const subpath of P2_SUBPATHS){const resolved=require.resolve('@sdcorejs/nova/'+subpath.slice(2));if(!resolved.startsWith(installed+path.sep))throw Error('Subpath escaped installed tarball '+subpath);}
 const {build}=await import('vite');const probes={button:{subpath:'button',symbol:'Button'},query:{subpath:'query',symbol:'serializeQuery'},storage:{subpath:'adapters/storage',symbol:'createLocalStorageAdapter'},table:{subpath:'data-table',symbol:'DataTable'},pdf:{subpath:'pdf-preview',symbol:'PdfPreview'},workbook:{subpath:'import-wizard',symbol:'ImportWizard'}};
 const probeRoot=path.join(consumer,'node_modules/.nova-p2-probes',path.basename(output));mkdirSync(probeRoot,{recursive:true});const receipts=[];
 for(const [name,probe]of Object.entries(probes)){
  const entry=path.join(probeRoot,name+'.mjs');writeFileSync(entry,'import {'+probe.symbol+"} from '@sdcorejs/nova/"+probe.subpath+"'; globalThis.__novaP2Probe="+probe.symbol+';\n');
  const outDir=path.join(output,name);let bundled=[];await build({configFile:false,root:consumer,cacheDir:path.join(output,'vite-cache'),logLevel:'silent',build:{outDir,emptyOutDir:false,minify:false,sourcemap:true,lib:{entry,formats:['es'],fileName:'probe'},rolldownOptions:{plugins:[{name:'record-p2-installed-modules',generateBundle(){bundled=[...this.getModuleIds()];}}]}}});
  const modules=bundled.map(file=>file.split(path.sep).join('/'));if(!modules.some(file=>file.startsWith(installed.split(path.sep).join('/')+'/')))throw Error('No installed Nova modules in '+name+' probe');
  if(modules.some(file=>/node_modules\/(?:pdfjs-dist|xlsx|exceljs|@tanstack\/|react-hook-form|@js-temporal\/)/u.test(file)))throw Error('Packed probe imports optional/heavy engine '+name);
  if(name==='query'&&modules.some(file=>/node_modules\/(?:react|react-dom)\/|dist\/(?:components|providers|hooks)\//u.test(file)))throw Error('Packed pure query includes UI');
  if(name==='storage'&&modules.some(file=>/node_modules\/(?:react|react-dom)\/|dist\/(?:components|providers|hooks)\//u.test(file)))throw Error('Packed storage factory includes UI');
  if(name==='button'&&modules.some(file=>/dist\/components\/(?:data-table|pdf-preview|import-wizard)\//u.test(file)))throw Error('Packed Button imports P2 engines/components');
  receipts.push({name,subpath:probe.subpath,entry,resolved:require.resolve('@sdcorejs/nova/'+probe.subpath),modules,output:outDir});
 }
 const receipt={consumer,installed,installed_manifest_digest:digest(readFileSync(path.join(installed,'package.json'))),installed_root_digest:digest(readFileSync(path.join(installed,'dist/index.js'))),aggregate_css_digest:digest(readFileSync(path.join(installed,'dist/styles.css'))),subpaths:P2_SUBPATHS,probes:receipts};mkdirSync(output,{recursive:true});writeFileSync(path.join(output,'installed-proof.json'),JSON.stringify(receipt,null,2)+'\n');console.log('check-p2: installed tarball public/CSS + 6 bundle isolation probes PASS');return receipt;
}
const isCli=process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase();
if(isCli){
 if(process.argv.includes('--showcase')){
  if(!existsSync(path.join(ROOT,'test/showcase/p2-showcase.spec.ts')))throw Error('P2 showcase spec is missing; complete TASK-032/033 before the combined showcase gate');
  const parent=path.join(ROOT,'.sdcorejs/tmp/p2-integration');mkdirSync(parent,{recursive:true});const output=mkdtempSync(path.join(parent,'showcase-'));const config=path.join(output,'playwright.config.ts');
  writeFileSync(config,"import original from '../../../../test/showcase/playwright.config.ts';\nimport {additiveShowcaseConfig} from '../../../../scripts/check-p2-contracts.mjs';\nexport default {...additiveShowcaseConfig(original),testDir:"+JSON.stringify(path.join(ROOT,'test/showcase'))+",outputDir:"+JSON.stringify(path.join(output,'results'))+"};\n");
  const args=[path.join(ROOT,'node_modules/@playwright/test/cli.js'),'test','--config',config,...process.argv.slice(2).filter(arg=>arg!=='--showcase')];const result=spawnSync(process.execPath,args,{cwd:ROOT,stdio:'inherit'});process.exitCode=result.status??1;
 }else{const errors=await checkP2Contracts();for(const error of errors)console.error('check-p2: '+error);if(errors.length)process.exitCode=1;else console.log('check-p2: 24 root runtime exports, 22 subpaths, 16 aggregate component styles, pure query and engine/storage boundaries PASS');}
}

// Inherited P1 CSP-B invariant: classify measured Base UI attributes separately.
// Base UI DialogPopup owns this fixed count; this fixture has exactly one popup and no nested dialog.
// This does not extend Nova's D002 geometry allowance or accept arbitrary CSS variables.
export function isInheritedDialogStyle(selector,property,value){return selector==='.nova-dialog.nova-resizable-dialog'&&property==='--nested-dialogs'&&value==='0';}

// Exact inherited Base UI overlay profiles measured in the separate single-dialog fixture.
// Identity markers bind the nodes to the primitive portal; no Nova geometry exception is added.
export function isInheritedOverlayStyle(element){
 if(!element||element.parentPortal!==true||element.ownsGeometryPopup!==true||element.inert!==true||element.ariaHidden!=='true'||typeof element.cssText!=='string')return false;
 const declarations={};for(const declaration of element.cssText.split(';').map(part=>part.trim()).filter(Boolean)){const separator=declaration.indexOf(':');if(separator<1)return false;const property=declaration.slice(0,separator).trim(),value=declaration.slice(separator+1).trim();if(Object.hasOwn(declarations,property))return false;declarations[property]=value;}
 const exact=expected=>Object.keys(declarations).length===Object.keys(expected).length&&Object.entries(expected).every(([key,value])=>declarations[key]===value);
 if(element.tag==='DIV'&&element.role==='presentation'&&element.focusGuard===false){
  const expected=element.className===''?{position:'fixed',inset:'0px','user-select':'none'}:element.className==='nova-dialog__backdrop'?{'user-select':'none'}:null;
  if(!expected)return false;if(Object.hasOwn(declarations,'-webkit-user-select'))expected['-webkit-user-select']='none';return exact(expected);
 }
 if(element.tag==='SPAN'&&element.className===''&&element.role===null&&element.focusGuard===true&&element.dataType==='inside'&&element.tabIndex==='0')return exact({'clip-path':'inset(50%)',overflow:'hidden','white-space':'nowrap',border:'0px',padding:'0px',width:'1px',height:'1px',margin:'-1px',position:'fixed',top:'0px',left:'0px'});
 return false;
}
