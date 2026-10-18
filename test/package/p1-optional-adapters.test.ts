// @vitest-environment node
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const manifest=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8'));
it('publishes every P1 module through explicit typed subpaths',()=>{for(const name of ['accordion','action-menu','anchor-navigation','app-shell','busy-boundary','copy-button','date-picker','date-time-picker','dialog','highlight','inline-edit','inline-text','multi-select','number-input','popover','read-only-value','scroll-area','segmented-control','select','stepper','tabs','time-input','async-action','clipboard','form-validation','formatter','viewport','confirm','toast','unsaved-changes','adapters/react-hook-form','adapters/temporal']){expect(manifest.exports['./'+name],name).toEqual({types:expect.stringMatching(/^\.\/dist\/.+\/index\.d\.ts$/u),default:expect.stringMatching(/^\.\/dist\/.+\/index\.js$/u)});}});
it('keeps the two approved engines optional with exact compatibility fixtures',()=>{expect(manifest.peerDependencies['react-hook-form']).toBe('~7.89.0');expect(manifest.peerDependencies['@js-temporal/polyfill']).toBe('~0.5.1');expect(manifest.peerDependenciesMeta).toEqual({'react-hook-form':{optional:true},'@js-temporal/polyfill':{optional:true}});expect(manifest.devDependencies['react-hook-form']).toBe('7.89.0');expect(manifest.devDependencies['@js-temporal/polyfill']).toBe('0.5.1');expect(Object.keys(manifest.dependencies)).toEqual(['@base-ui/react']);});

it('keeps mandatory runtime inventory distinct and checks every optional adapter license',async()=>{
 const {loadRepositoryInput,checkProvenance}=await import(new URL('../../scripts/check-provenance.mjs',import.meta.url).href) as {
  loadRepositoryInput:()=>{files:{path:string;content:string}[];provenance:unknown;notices:string;runtimeDependencies:string[];optionalNoticeDependencies:string[]};
  checkProvenance:(input:unknown)=>string[];
 };
 const input=loadRepositoryInput();expect(input.runtimeDependencies).toEqual(['@base-ui/react']);
 expect(input.optionalNoticeDependencies).toEqual(['@js-temporal/polyfill','jsbi','react-hook-form']);
 for(const peer of input.optionalNoticeDependencies){
  const notices=input.notices.split('## '+peer).join('## Missing license');
  expect(checkProvenance({...input,notices}).join('\n')).toContain(peer);
 }
 expect(checkProvenance(input)).toEqual([]);
});
