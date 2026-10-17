import type { DiagnosticOwner } from '../../lib/diagnostics.js';
import type { NovaScope } from '../../providers/nova/context.js';
import type { Key } from '../../types/index.js';
import type { TreeSource } from './tree.js';

export type Branch<T> = { status:'loading'|'ready'|'error'; children?:readonly T[]; controller:AbortController; generation:number };
/** Mutable request ownership stays inside an instance-local collaborator, never React props. */
export function createBranchOwner<T,K extends Key>(identity:readonly unknown[]) {
  let active=false,generation=0;
  const branches=new Map<K,Branch<T>>();
  return {identity,branches,isActive:()=>active,nextGeneration:()=>++generation,activate:()=>{active=true;},dispose:()=>{active=false;for(const entry of branches.values())entry.controller.abort();branches.clear();}};
}
export type TreeNode<T,K extends Key> = { item:T; key:K; parent:TreeNode<T,K>|undefined; level:number; position:number; size:number; children:TreeNode<T,K>[]; branch:boolean; truncated:boolean };
export type TreeDiagnostic = 'NOVA_TREE_CYCLE'|'NOVA_TREE_DUPLICATE_KEY'|'NOVA_TREE_INVALID_KEY'|'NOVA_TREE_INVALID_DEPTH'|'NOVA_TREE_INVALID_SOURCE';
const diagnosticMessages:Record<TreeDiagnostic,string>={NOVA_TREE_CYCLE:'tree paths must be acyclic',NOVA_TREE_DUPLICATE_KEY:'tree items must have unique typed keys',NOVA_TREE_INVALID_KEY:'tree keys must be strings or finite numbers',NOVA_TREE_INVALID_DEPTH:'maxDepth must be a positive safe integer',NOVA_TREE_INVALID_SOURCE:'tree accessors must return a valid hierarchy'};
declare const process:{env:{NODE_ENV?:string}};
export function reportTreeDiagnostic(owner:DiagnosticOwner,code:TreeDiagnostic) {
  try { if(process.env.NODE_ENV==='production')return; } catch { /* Browser bundles need no process global. */ }
  const id=`${code}|Tree`; if(owner.seen.has(id))return; owner.seen.add(id); console.warn(`[nova] ${code} <Tree>: ${diagnosticMessages[code]}`);
}

/** Iterative validation also visits collapsed static descendants; it never calls a lazy transport. */
export function buildTree<T,K extends Key>(source:TreeSource<T,K>,getKey:(item:T)=>K,branches:ReadonlyMap<K,Branch<T>>,maxDepth:number|undefined):{roots:TreeNode<T,K>[];error?:TreeDiagnostic} {
  if(maxDepth!==undefined&&(!Number.isSafeInteger(maxDepth)||maxDepth<1))return {roots:[],error:'NOVA_TREE_INVALID_DEPTH'};
  const roots:TreeNode<T,K>[]=[], seen=new Set<K>(), active=new Set<K>();
  type Work={item:T;parent:TreeNode<T,K>|undefined;level:number;position:number;size:number;output:TreeNode<T,K>[]}|{exit:K};
  const stack:Work[]=[];
  const push=(items:readonly T[],parent:TreeNode<T,K>|undefined,level:number,output:TreeNode<T,K>[])=>{for(let i=items.length-1;i>=0;i--)stack.push({item:items[i]!,parent,level,position:i+1,size:items.length,output});};
  try {
    push(source.roots,undefined,1,roots);
    while(stack.length) {
      const work=stack.pop()!; if('exit' in work){active.delete(work.exit);continue;}
      const key=getKey(work.item);
      if((typeof key!=='string'&&typeof key!=='number')||(typeof key==='number'&&!Number.isFinite(key)))return {roots:[],error:'NOVA_TREE_INVALID_KEY'};
      if(active.has(key))return {roots:[],error:'NOVA_TREE_CYCLE'};
      if(seen.has(key))return {roots:[],error:'NOVA_TREE_DUPLICATE_KEY'};
      seen.add(key); active.add(key); stack.push({exit:key});
      const entry=branches.get(key), children=source.mode==='static'?source.getChildren(work.item):entry?.status==='ready'?entry.children??[]:[];
      if(!Array.isArray(children))return {roots:[],error:'NOVA_TREE_INVALID_SOURCE'};
      const hasChildren=source.mode==='static'?children.length>0:entry?.status==='ready'?children.length>0:source.hasChildren(work.item);
      const truncated=hasChildren&&maxDepth!==undefined&&work.level>=maxDepth;
      const node:TreeNode<T,K>={item:work.item,key,parent:work.parent,level:work.level,position:work.position,size:work.size,children:[],branch:hasChildren&&!truncated,truncated};
      if(maxDepth===undefined||work.level<=maxDepth)work.output.push(node);
      // Validate static data even below the configured presentation boundary.
      push(children,node,work.level+1,node.children);
    }
    return {roots};
  } catch {return {roots:[],error:'NOVA_TREE_INVALID_SOURCE'};}
}
export function visibleTree<T,K extends Key>(roots:readonly TreeNode<T,K>[],expanded:readonly K[]):TreeNode<T,K>[] {
  const visible:TreeNode<T,K>[]=[], stack=[...roots].reverse();
  while(stack.length){const node=stack.pop()!;visible.push(node);if(node.branch&&expanded.includes(node.key))stack.push(...[...node.children].reverse());}
  return visible;
}
export type TreeStrings={name:string;empty:string;loading:string;error:string;retry:string;expand:string;collapse:string;actions:string;truncated:string;invalid:string};
const en:TreeStrings={name:'Tree',empty:'No items',loading:'Loading children for {label}',error:'Unable to load children for {label}',retry:'Retry {label}',expand:'Expand {label}',collapse:'Collapse {label}',actions:'Actions for {label}',truncated:'Maximum tree depth reached',invalid:'Unable to display this tree'};
const vi:TreeStrings={name:'Cây',empty:'Không có mục nào',loading:'Đang tải mục con của {label}',error:'Không thể tải mục con của {label}',retry:'Thử lại {label}',expand:'Mở rộng {label}',collapse:'Thu gọn {label}',actions:'Thao tác cho {label}',truncated:'Đã đạt độ sâu tối đa của cây',invalid:'Không thể hiển thị cây này'};
export function treeStrings(scope:NovaScope):TreeStrings {
  const navigation=scope.strings.navigation as typeof scope.strings.navigation & Partial<Record<`tree${Capitalize<keyof TreeStrings>}`,string>>;
  const fallback=scope.locale.toLowerCase().startsWith('vi')?vi:en;
  return {name:navigation.treeName??fallback.name,empty:navigation.treeEmpty??fallback.empty,loading:navigation.treeLoading??fallback.loading,error:navigation.treeError??fallback.error,retry:navigation.treeRetry??fallback.retry,expand:navigation.treeExpand??fallback.expand,collapse:navigation.treeCollapse??fallback.collapse,actions:navigation.treeActions??fallback.actions,truncated:navigation.treeTruncated??fallback.truncated,invalid:navigation.treeInvalid??fallback.invalid};
}
export function treeMessage(template:string,label:string){return template.replaceAll('{label}',label);}
