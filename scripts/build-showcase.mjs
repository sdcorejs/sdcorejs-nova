import {build} from 'vite';
import {execFileSync} from 'node:child_process';
import {copyFileSync,writeFileSync,readdirSync,readFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'showcase/dist');
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root,encoding:'utf8'}).trim();
const commit=git('rev-parse','HEAD');if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid build revision');
if(process.env.GITHUB_SHA&&process.env.GITHUB_SHA!==commit)throw Error('Checkout revision differs from GitHub run revision');
const deploymentBuild=Boolean(process.env.GITHUB_ACTIONS)||process.argv.includes('--deploy');
if(deploymentBuild&&git('status','--porcelain=v1','--untracked-files=normal'))throw Error('Dirty source cannot build a deployment artifact');
const bundledPackages=new Map();
await build({configFile:path.join(root,'showcase/vite.config.mjs'),plugins:[{
 name:'nova-private-bundled-license-inventory',
 generateBundle(_options,bundle){
  for(const chunk of Object.values(bundle)){
   if(chunk.type!=='chunk')continue;
   for(const id of Object.keys(chunk.modules)){
    if(!id.replaceAll('\\','/').includes('/node_modules/'))continue;
    let dir=path.dirname(id.split('?')[0]);
    while(dir!==path.dirname(dir)){
     const manifestFile=path.join(dir,'package.json');
     if(existsSync(manifestFile)){
      const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
      if(manifest.name&&manifest.version){const licenseFile=['LICENSE','LICENSE.md','LICENSE.txt'].find(file=>existsSync(path.join(dir,file)));if(!licenseFile)throw Error('Bundled package has no installed license '+manifest.name);const text=readFileSync(path.join(dir,licenseFile),'utf8').trim().replaceAll('\r\n','\n');bundledPackages.set(manifest.name,{name:manifest.name,version:manifest.version,license:manifest.license,license_sha256:createHash('sha256').update(text).digest('hex')});break;}
     }
     dir=path.dirname(dir);
    }
   }
  }
 },
}]});
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])copyFileSync(path.join(root,file),path.join(output,file));
const assets=readdirSync(path.join(output,'assets')).sort().map(file=>({file:'assets/'+file,sha256:createHash('sha256').update(readFileSync(path.join(output,'assets',file))).digest('hex')}));
const workingTreeDirty=Boolean(git('status','--porcelain=v1','--untracked-files=normal'));
if(deploymentBuild&&workingTreeDirty)throw Error('Source became dirty during deployment build');
writeFileSync(path.join(output,'revision.json'),JSON.stringify({commit,workingTreeDirty,assets},null,2)+'\n');
const report=path.join(root,'.sdcorejs/tmp/nova-showcase-build/bundle-inventory.json');mkdirSync(path.dirname(report),{recursive:true});
writeFileSync(report,JSON.stringify({commit,assets,packages:[...bundledPackages.values()].sort((a,b)=>a.name.localeCompare(b.name))},null,2)+'\n');
console.log(`Showcase revision ${commit}; workingTreeDirty=${workingTreeDirty}. Local dirty build is not public deployment evidence.`);
