import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,mkdirSync,rmSync,linkSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {checkArtifact,checkWorkflow} from '../../scripts/check-showcase.mjs';
const root=path.resolve(import.meta.dirname,'../..'),output=path.join(root,'showcase/dist');
const revision=()=>JSON.parse(readFileSync(path.join(output,'revision.json'),'utf8')).commit;
function rejects(change,pattern){const dir=mkdtempSync(path.join(tmpdir(),'nova-showcase-check-'));try{cpSync(output,dir,{recursive:true});change(dir);assert.throws(()=>checkArtifact(dir,{expectedRevision:revision(),repositoryRoot:root}),pattern);}finally{rmSync(dir,{recursive:true,force:true});}}
test('actual public artifact and workflow satisfy project-base, revision, notices and isolated deployment',()=>{checkArtifact(output,{expectedRevision:revision(),repositoryRoot:root});checkWorkflow(readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8'));});
test('private path and source map cannot enter output',()=>{rejects(dir=>{mkdirSync(path.join(dir,'.sdcorejs'));writeFileSync(path.join(dir,'.sdcorejs','log.txt'),'private');},/allowlist/);rejects(dir=>writeFileSync(path.join(dir,'assets','leak.js.map'),'{}'),/allowlist/);});
test('hardlinked artifact file is rejected even with an allowed filename',()=>{rejects(dir=>{const asset=readdirSync(path.join(dir,'assets')).find(f=>f.endsWith('.js'));linkSync(path.join(dir,'assets',asset),path.join(dir,'assets','hardlink.js'));},/hardlink/);});
test('revision accepts only exact public metadata and asset keys',()=>{for(const extra of [false,true])rejects(dir=>{const f=path.join(dir,'revision.json'),data=JSON.parse(readFileSync(f,'utf8'));if(extra)data.assets[0].comment='extra';else data.comment='extra';writeFileSync(f,JSON.stringify(data));},/metadata/);});
test('root-relative and encoded traversal assets are rejected',()=>{for(const asset of ['/assets/bad.js','/sdcorejs-nova/assets/%2e%2e/bad.js'])rejects(dir=>{const f=path.join(dir,'index.html');writeFileSync(f,readFileSync(f,'utf8').replace(/\/sdcorejs-nova\/assets\/[^" ]+\.js/,asset));},/asset|path|base/);});
test('revision mismatch and malformed revision fail',()=>{rejects(dir=>writeFileSync(path.join(dir,'revision.json'),JSON.stringify({commit:'a'.repeat(40)})),/revision/);rejects(dir=>writeFileSync(path.join(dir,'revision.json'),JSON.stringify({commit:'unknown'})),/revision/);});
test('dirty local preview metadata cannot pass deployment checks',()=>{const dir=mkdtempSync(path.join(tmpdir(),'nova-showcase-dirty-'));try{cpSync(output,dir,{recursive:true});const file=path.join(dir,'revision.json'),metadata=JSON.parse(readFileSync(file,'utf8'));metadata.workingTreeDirty=true;writeFileSync(file,JSON.stringify(metadata));assert.throws(()=>checkArtifact(dir,{expectedRevision:revision(),repositoryRoot:root,requireClean:true}),/dirty/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('bundle licenses and private transfer/source strings are checked',()=>{rejects(dir=>writeFileSync(path.join(dir,'THIRD_PARTY_BUNDLE_LICENSES.md'),'React'),/license/);rejects(dir=>{const f=path.join(dir,'index.html');writeFileSync(f,readFileSync(f,'utf8')+'<!-- Sentinel_private signed_transfer_url -->');},/private|forbidden/);});
test('removing an entire transitive license section cannot evade bundle inventory validation',()=>{rejects(dir=>{const f=path.join(dir,'THIRD_PARTY_BUNDLE_LICENSES.md');writeFileSync(f,readFileSync(f,'utf8').replace(/## scheduler - [\s\S]*?(?=\n## |$)/,''));},/license inventory/);});
// Mutations must be effective on LF and CRLF checkouts before testing rejection.
function rejectWorkflow(original,mutated,pattern){assert.notEqual(mutated,original,'workflow mutation must change the fixture');assert.throws(()=>checkWorkflow(mutated),pattern);}
function workflowText(){return readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').replace(/\r\n/g,'\n');}
test('workflow rejects write-all, missing browser gate and always-upload',()=>{
 const text=workflowText();
 rejectWorkflow(text,text.replace('permissions:\n  contents: read','permissions: write-all'),/permission/);
 rejectWorkflow(text,text.replace('      - name: Showcase production browser checks\n        run: npm run test:showcase\n',''),/gate|order/);
 rejectWorkflow(text,text.replace('      - name: Upload checked static artifact only','      - name: Upload checked static artifact only\n        if: always()'),/conditional|upload|step/);
});
test('workflow cannot skip required checks through echo shell or default execution overrides',()=>{
 const text=workflowText();
 rejectWorkflow(text,text.replace('        run: npm run test:showcase','        run: npm run test:showcase\n        shell: echo {0}'),/modifier/);
 rejectWorkflow(text,text.replace('jobs:','defaults:\n  run:\n    shell: echo {0}\n\njobs:'),/modifier/);
});
test('Pages workflow rejects permission escalation, missing read permission, unpinned action and non-main dispatch',()=>{
 const text=workflowText();
 rejectWorkflow(text,text.replace('contents: read','contents: write'),/permission/);
 rejectWorkflow(text,text.replace('pages: read','pages: none'),/permission/);
 rejectWorkflow(text,text.replace(/actions\/checkout@[a-f0-9]{40}/,'actions/checkout@main'),/pin/);
 rejectWorkflow(text,text.replaceAll("if: github.ref == 'refs/heads/main'",'if: always()'),/main/);
});

// The inline monogram is the existing Nova n mark; the artifact permits only this exact non-executable image.
const approvedIconURI = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%23171717%22%2F%3E%3Ctext%20x%3D%227%22%20y%3D%2225%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22600%22%20fill%3D%22%23fff%22%3En%3C%2Ftext%3E%3C%2Fsvg%3E";
const approvedIconTag = '<link rel="icon" type="image/svg+xml" href="' + approvedIconURI + '" />';
function setArtifactIcon(dir, markup) { const file=path.join(dir,'index.html'), original=readFileSync(file,'utf8'), without=original.replace(/<link\b[^>]*\brel=["']icon["'][^>]*>/gi,''); writeFileSync(file,without.replace('<head>','<head>\n'+markup)); }
test('exact static Nova favicon is accepted while retaining all asset and revision checks',()=>{const dir=mkdtempSync(path.join(tmpdir(),'nova-showcase-icon-'));try{cpSync(output,dir,{recursive:true});setArtifactIcon(dir,approvedIconTag);assert.doesNotThrow(()=>checkArtifact(dir,{expectedRevision:revision(),repositoryRoot:root}));}finally{rmSync(dir,{recursive:true,force:true});}});
test('artifact must declare the approved favicon instead of relying on a missing origin favicon',()=>{rejects(dir=>setArtifactIcon(dir,''),/favicon/);});
for(const [name,markup] of [
 ['another inline image',approvedIconTag.replace(approvedIconURI,'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E')],
 ['external favicon',approvedIconTag.replace(approvedIconURI,'https://example.invalid/icon.svg')],
 ['event attribute',approvedIconTag.replace(' />',' onload="alert(1)" />')],
 ['duplicate favicon',approvedIconTag+'\n'+approvedIconTag],
 ['comment-only favicon','<!-- '+approvedIconTag+' -->'],
]){test('favicon boundary rejects '+name,()=>{rejects(dir=>setArtifactIcon(dir,markup),/favicon|project base|unsafe asset/);});}

// Review R1: a browser-effective second icon must never escape the exact generated link boundary.
for(const [name,extra] of [
 ['shortcut rel with single-quoted href',"<link rel=\"shortcut icon\" href='https://example.invalid/icon.svg'>"],
 ['uppercase shortcut rel',"<LINK REL='SHORTCUT ICON' HREF='https://example.invalid/icon.svg'>"],
 ['unquoted icon attributes','<link rel=icon href=https://example.invalid/icon.svg>'],
 ['entity-encoded icon rel',"<link rel='ic&#111;n' href='https://example.invalid/icon.svg'>"],
 ['malformed comment with active icon',"<!--><link rel='shortcut icon' href='https://example.invalid/icon.svg'>-->"],
 ['comment-hidden extra icon',"<!-- <link rel='shortcut icon' href='https://example.invalid/icon.svg'> -->"],
]){test('favicon link boundary rejects '+name,()=>{rejects(dir=>setArtifactIcon(dir,approvedIconTag+extra),/favicon|link|comment/);});}
test('favicon link boundary rejects event attributes on a second generated stylesheet',()=>{rejects(dir=>{const html=readFileSync(path.join(dir,'index.html'),'utf8'),style=html.match(/<link rel="stylesheet"[^>]*>/)?.[0];assert.ok(style,'actual generated stylesheet is required');setArtifactIcon(dir,approvedIconTag+style.replace('>',' onload="alert(1)">'));},/favicon|link|comment/);});
test('favicon link boundary rejects an unclosed comment hiding the canonical icon',()=>{rejects(dir=>setArtifactIcon(dir,'<!--'+approvedIconTag),/favicon|link|comment/);});

// Review R1: match the whole generated HTML grammar, including browser-inert lookalikes.
for(const [name,markup] of [
 ['bogus declaration','<!x '+approvedIconTag+'>'],
 ['processing instruction','<?x '+approvedIconTag+'>'],
 ['inert template','<template>'+approvedIconTag+'</template>'],
 ['textarea text','<textarea>'+approvedIconTag+'</textarea>'],
 ['attribute text',"<meta name=\"icon-text\" content='"+approvedIconTag+"'>"],
 ['inert script text','<script type="text/plain">'+approvedIconTag+'</script>'],
]){test('favicon generated template rejects '+name,()=>{rejects(dir=>setArtifactIcon(dir,markup),/favicon|template|asset/);});}

import ts from 'typescript';
test('SHOWCASE-SUITE-BUDGET-R1 bounds the expanded 87-case suite while retaining per-test limits and discovery',()=>{
 const file=path.join(root,'test/showcase/playwright.config.ts'),ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),declaration=ast.statements.find(ts.isExportAssignment);
 assert.ok(declaration&&ts.isCallExpression(declaration.expression),'actual defineConfig export is required');
 const config=declaration.expression.arguments[0];assert.ok(ts.isObjectLiteralExpression(config),'actual configuration object is required');
 const value=name=>{const property=config.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)===name);assert.ok(property,'configuration property '+name+' is required');return property.initializer;};
 const number=name=>{const node=value(name);assert.ok(ts.isNumericLiteral(node),'numeric limit '+name+' is required');return Number(node.text);};
 assert.equal(number('globalTimeout'),300000,'87-case overall budget includes the final existing 120s accessibility test');
 assert.equal(number('timeout'),20000);assert.equal(number('workers'),1);assert.equal(number('retries'),0);
 const match=value('testMatch');assert.ok(ts.isArrayLiteralExpression(match));assert.deepEqual(match.elements.map(node=>node.text),['showcase.spec.ts','p2-showcase.spec.ts']);
});
