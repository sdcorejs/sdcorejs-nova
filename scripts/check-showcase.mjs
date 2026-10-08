import {readFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
// Build-tool parser owned by declared ESLint -> @eslint/eslintrc -> js-yaml.
// Resolve through those packages rather than relying on root hoisting.
const eslintRequire=createRequire(import.meta.resolve('eslint'));
const parserRequire=createRequire(eslintRequire.resolve('@eslint/eslintrc'));
const yaml=parserRequire('js-yaml');
const root=path.resolve(import.meta.dirname,'..');
const pins={checkout:'3d3c42e5aac5ba805825da76410c181273ba90b1','setup-node':'820762786026740c76f36085b0efc47a31fe5020','configure-pages':'45bfe0192ca1faeb007ade9deae92b16b8254a0d','upload-pages-artifact':'fc324d3547104276b827a68afc52ff2a11cc49c9','deploy-pages':'368f82528645a54fb793d4d04e342629a3f51346'};
function ensure(value,message){if(!value)throw new Error(message);}
function walk(dir,prefix=''){return readdirSync(dir).flatMap(name=>{const file=path.join(dir,name),relative=prefix+name,stat=lstatSync(file);ensure(!stat.isSymbolicLink(),'artifact path symlink forbidden');if(stat.isDirectory())return walk(file,relative+'/');ensure(stat.isFile()&&stat.nlink===1,'artifact non-regular file or hardlink forbidden');return [relative];});}
export function checkArtifact(output,{expectedRevision,repositoryRoot=root,requireClean=false}={}){
 const files=walk(output),allowed=/^(?:index\.html|revision\.json|LICENSE|THIRD_PARTY_NOTICES\.md|THIRD_PARTY_BUNDLE_LICENSES\.md|assets\/[A-Za-z0-9_-]+\.(?:js|css))$/;
 ensure(files.every(f=>allowed.test(f)),'artifact allowlist violation');
 for(const f of ['index.html','revision.json','LICENSE','THIRD_PARTY_NOTICES.md','THIRD_PARTY_BUNDLE_LICENSES.md'])ensure(files.includes(f),`artifact required file ${f}`);
 const text=f=>readFileSync(path.join(output,f),'utf8');
 for(const file of files)ensure(!/\.sdcorejs|Sentinel_|signed_transfer|libfile_|sourceMappingURL|C:[\\/]+Users[\\/]+/i.test(text(file)),`private/forbidden content in ${file}`);
 const html=text('index.html'),links=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
 ensure(links.some(l=>l.endsWith('.js'))&&links.some(l=>l.endsWith('.css')),'missing built assets');
 for(const link of links){ensure(link.startsWith('/sdcorejs-nova/assets/'),'asset project base mismatch');const decoded=decodeURIComponent(link.slice('/sdcorejs-nova/'.length));ensure(!decoded.includes('..')&&!decoded.includes('\\')&&allowed.test(decoded),'unsafe asset path');ensure(files.includes(decoded),`asset missing ${decoded}`);}
 const revision=JSON.parse(text('revision.json'));ensure(/^[a-f0-9]{40}$/.test(revision.commit)&&revision.commit===expectedRevision,'revision mismatch or invalid');
 ensure(JSON.stringify(Object.keys(revision).sort())===JSON.stringify(['assets','commit','workingTreeDirty']),'revision contains unknown public metadata');
 ensure(typeof revision.workingTreeDirty==='boolean'&&Array.isArray(revision.assets),'revision metadata malformed');
 ensure(!requireClean||revision.workingTreeDirty===false,'dirty local revision cannot be deployed');
 const actualAssets=files.filter(f=>f.startsWith('assets/')).sort();ensure(JSON.stringify(revision.assets.map(a=>a.file).sort())===JSON.stringify(actualAssets),'revision asset inventory mismatch');
 for(const asset of revision.assets){ensure(JSON.stringify(Object.keys(asset).sort())===JSON.stringify(['file','sha256']),'revision asset contains unknown metadata');ensure(asset.sha256===createHash('sha256').update(readFileSync(path.join(output,asset.file))).digest('hex'),'revision asset hash mismatch');}
 for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])ensure(text(file)===readFileSync(path.join(repositoryRoot,file),'utf8'),`license notice changed ${file}`);
 const licenses=text('THIRD_PARTY_BUNDLE_LICENSES.md');ensure(licenses.length>1000,'bundle license text missing');
 const inventory=[...licenses.matchAll(/^## ([@\w./-]+) - ([\w.+-]+) \(([^)]+)\)$/gm)];ensure(inventory.length>=3,'bundle license inventory missing');
 const report=JSON.parse(readFileSync(path.join(repositoryRoot,'.sdcorejs/tmp/nova-showcase-build/bundle-inventory.json'),'utf8'));
 ensure(report.commit===revision.commit&&JSON.stringify(report.assets)===JSON.stringify(revision.assets),'private bundled license inventory is stale for revision/assets');
 ensure(JSON.stringify(inventory.map(m=>m[1]).sort())===JSON.stringify(report.packages.map(p=>p.name).sort()),'bundle license inventory differs from actual emitted modules');
 for(const pkg of ['react','react-dom','@base-ui/react'])ensure(inventory.some(m=>m[1]===pkg),'bundle license package inventory missing '+pkg);
 for(const entry of inventory){const pkg=entry[1],manifest=JSON.parse(readFileSync(path.join(repositoryRoot,'node_modules',pkg,'package.json'),'utf8'));ensure(entry[2]===manifest.version&&entry[3]===manifest.license,'bundle license metadata differs '+pkg);const candidate=['LICENSE','LICENSE.md','LICENSE.txt'].find(f=>existsSync(path.join(repositoryRoot,'node_modules',pkg,f)));ensure(candidate,'installed license missing '+pkg);const upstream=readFileSync(path.join(repositoryRoot,'node_modules',pkg,candidate),'utf8').trim().replaceAll('\r\n','\n');ensure(licenses.replaceAll('\r\n','\n').includes(upstream),'bundle license text differs from installed '+pkg);const expected=report.packages.find(p=>p.name===pkg);ensure(expected.version===manifest.version&&expected.license===manifest.license&&expected.license_sha256===createHash('sha256').update(upstream).digest('hex'),'private bundled license fingerprint differs '+pkg);}
 return {files:files.length,commit:revision.commit,workingTreeDirty:revision.workingTreeDirty};
}
export function checkWorkflow(text){
 ensure(!/secrets\.|npm publish|npm login|NODE_AUTH_TOKEN|pull_request_target/.test(text),'workflow permission or publication violation');
 const workflow=yaml.load(text);
 const allowedKeys=(value,keys,scope)=>ensure(Object.keys(value).every(key=>keys.includes(key)),`workflow ${scope} execution modifier forbidden`);
 allowedKeys(workflow,['name','on','permissions','concurrency','jobs'],'root');
 ensure(isDeepStrictEqual(workflow.permissions,{contents:'read'}),'workflow permission must be exact read-only contents');
 ensure(isDeepStrictEqual(Object.keys(workflow.on).sort(),['push','workflow_dispatch'])&&isDeepStrictEqual(workflow.on.push,{branches:['main']}),'workflow main trigger mismatch');
 ensure(isDeepStrictEqual(Object.keys(workflow.jobs).sort(),['build','deploy']),'workflow job policy mismatch');
 const {build,deploy}=workflow.jobs;
 allowedKeys(build,['if','permissions','runs-on','timeout-minutes','steps'],'build');
 allowedKeys(deploy,['if','needs','runs-on','timeout-minutes','permissions','environment','steps'],'deploy');
 for(const job of [build,deploy])for(const step of job.steps)allowedKeys(step,['name','id','uses','with','run'],'step');
 ensure(build.if==="github.ref == 'refs/heads/main'"&&deploy.if==="github.ref == 'refs/heads/main'",'workflow main-only guards missing');
 ensure(isDeepStrictEqual(build.permissions,{contents:'read',pages:'read'}),'build configure-pages read permission mismatch');
 ensure(isDeepStrictEqual(deploy.permissions,{pages:'write','id-token':'write'}),'deploy permission mismatch');
 ensure(deploy.needs==='build'&&deploy.environment.name==='github-pages','workflow deploy needs/environment mismatch');
 ensure(build['runs-on']==='ubuntu-24.04'&&deploy['runs-on']==='ubuntu-24.04','workflow runner mismatch');
 ensure(workflow.concurrency.group==='pages'&&workflow.concurrency['cancel-in-progress']===false,'workflow concurrency mismatch');
 for(const job of [build,deploy]){ensure(!job['continue-on-error']&&!job.env,'workflow job bypass or env forbidden');for(const step of job.steps){ensure(step.if===undefined,'conditional upload/step bypass forbidden');ensure(step['continue-on-error']===undefined&&step.env===undefined,'workflow step bypass/env forbidden');if(step.uses){const match=/^actions\/([\w-]+)@([a-f0-9]{40})$/.exec(step.uses);ensure(match&&pins[match[1]]===match[2],'workflow pin mismatch');}}}
 const p0=['npm ci','npm run lint','npm run typecheck','npm run typecheck:fixtures','npm run build','npm run check:css','npm run check:package','npm run smoke:pack','npm run test:unit','npm run test:ssr','npx --no-install playwright install --with-deps chromium firefox webkit','npm run test:browser','npm run test:e2e','npm run check:bundle','npm run check:provenance'];
 const uses=name=>`actions/${name}@${pins[name]}`;
 const expected=[uses('checkout'),uses('setup-node'),...p0,'npm run typecheck:showcase','npm run build:showcase -- --deploy','npm run check:showcase','node scripts/check-showcase.mjs --deploy','npm run test:showcase',uses('configure-pages'),uses('upload-pages-artifact')];
 ensure(isDeepStrictEqual(build.steps.map(step=>step.uses??step.run),expected),'workflow required gate order mismatch');
 ensure(isDeepStrictEqual(deploy.steps.map(step=>step.uses??step.run),[uses('deploy-pages')]),'workflow deploy action order mismatch');
 ensure(build.steps[0].with['persist-credentials']===false&&build.steps[1].with['node-version']==='22.22.2','workflow checkout/node policy mismatch');
 ensure(build.steps.at(-2).with.enablement===false,'configure-pages must not enable or mutate site settings');
 ensure(isDeepStrictEqual(build.steps.at(-1).with,{path:'showcase/dist'}),'workflow artifact path mismatch');
 return true;
}
function checkSource(){
 const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));ensure(pkg.private===true&&pkg.version==='0.0.0'&&pkg.license==='MIT','package boundary changed');
 const exports=new Set(Object.keys(pkg.exports).map(p=>p==='.'?'@sdcorejs/nova':'@sdcorejs/nova/'+p.slice(2)));
 for(const f of walk(path.join(root,'showcase/src'))){const text=readFileSync(path.join(root,'showcase/src',f),'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*)['"](@sdcorejs\/nova[^'"]*)['"]/g))ensure(exports.has(m[1]),'private Nova import '+m[1]);ensure(!/from\s*['"](?:\.\.\/)+src\//.test(text),'library source import forbidden');}
 const config=readFileSync(path.join(root,'showcase/vite.config.mjs'),'utf8');ensure(/publicDir:false/.test(config)&&/sourcemap:false/.test(config)&&/THIRD_PARTY_BUNDLE_LICENSES\.md/.test(config),'public build config isolation missing');
 checkWorkflow(readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8'));
 const ci=readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');ensure(!/pages:\s*write|id-token:\s*write|contents:\s*write/.test(ci),'CI permission changed');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{const head=execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();if(process.env.GITHUB_SHA)ensure(process.env.GITHUB_SHA===head,'GitHub revision differs from checkout');checkSource();console.log(checkArtifact(path.join(root,'showcase/dist'),{expectedRevision:head,requireClean:Boolean(process.env.GITHUB_ACTIONS)||process.argv.includes('--deploy')}));}catch(error){console.error(error.message);process.exitCode=1;}
}
