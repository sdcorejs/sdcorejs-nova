import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ENGINES=['react-hook-form','@js-temporal/polyfill'];
/** Inspect runtime and declaration reachability independently of bundler tree shaking. */
export function checkRootGraph(read,entry='dist/index.js') {
 const visited=new Set(),errors=[];
 function visit(file){if(visited.has(file))return;visited.add(file);const code=read(file);if(typeof code!=='string'){errors.push(`Missing graph module: ${file}`);return;}
 const specifiers=[...code.matchAll(/from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/gu)].map(match=>match[1]??match[2]??match[3]);
 for(const name of specifiers){if(ENGINES.some(engine=>name===engine||name.startsWith(engine+'/')))errors.push(`${file} reaches optional engine ${name}`);if(name.startsWith('.')){let target=path.posix.normalize(path.posix.join(path.posix.dirname(file),name));if(file.endsWith('.d.ts'))target=target.replace(/\.js$/u,'.d.ts');if(target.includes('/adapters/'))errors.push(`${file} reaches isolated adapter ${target}`);visit(target);}}
 }visit(entry);return [...new Set(errors)];
}
export function checkOptionalPeers(manifest){const errors=[];for(const [name,version] of Object.entries({'react-hook-form':'7.89.0','@js-temporal/polyfill':'0.5.1'})){if(manifest.peerDependencies?.[name]!=='~'+version||manifest.peerDependenciesMeta?.[name]?.optional!==true||manifest.devDependencies?.[name]!==version||manifest.dependencies?.[name]||manifest.optionalDependencies?.[name])errors.push(`Invalid optional peer contract: ${name}`);}return errors;}
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase()){
 const manifest=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')),read=file=>existsSync(path.join(root,file))?readFileSync(path.join(root,file),'utf8'):undefined;
 const errors=[...checkOptionalPeers(manifest),...checkRootGraph(read),...checkRootGraph(read,'dist/index.d.ts')];for(const error of errors)console.error(error);if(errors.length)process.exit(1);console.log('check-p1-adapters: optional peers pinned; runtime and declaration root graphs isolated');
}
