'use client';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode, type Ref, type KeyboardEventHandler, type FocusEventHandler, type MouseEventHandler } from 'react';
import type { Key, LoadContext, MenuAction, SurfaceProps } from '../../types/index.js';
import { cx } from '../../lib/cx.js';
import { defaultSerializeKey } from '../../lib/radio-key.js';
import { useNovaScope } from '../../providers/nova/context.js';
import { Button } from '../button/button.js';
import { ActionMenu } from '../action-menu/action-menu.js';
import { buildTree, visibleTree, treeStrings, treeMessage, reportTreeDiagnostic, createBranchOwner, type Branch, type TreeNode } from './tree-model.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Preserve the dossier's TreeSource<T,K> arity without adding a fictitious runtime property.
export type TreeSource<T,_K extends Key=Key> = {mode:'static';roots:readonly T[];getChildren:(item:T)=>readonly T[];loadChildren?:never;hasChildren?:never}|{mode:'lazy';roots:readonly T[];hasChildren:(item:T)=>boolean;loadChildren:(item:T,context:LoadContext)=>Promise<readonly T[]>;getChildren?:never};
export type TreeProps<T,K extends Key> = SurfaceProps & {scopeKey:string;source:TreeSource<T,K>;getKey:(item:T)=>K;getLabel:(item:T)=>string;expandedKeys:readonly K[];onExpandedKeysChange:(keys:readonly K[])=>void;selectedKeys?:readonly K[];onSelectedKeysChange?:(keys:readonly K[])=>void;actions?:readonly MenuAction<T>[];renderItem?:(item:T)=>ReactNode;maxDepth?:number;disabled?:boolean;readOnly?:boolean;'aria-label'?:string;'aria-labelledby'?:string;ref?:Ref<HTMLUListElement>};

/** Branch presentation; Tree owns traversal, controlled proposals and reads. Ref points to the treeitem. */
export type TreeItemProps = SurfaceProps & {label:string;children?:ReactNode;group?:ReactNode;controls?:ReactNode;status?:ReactNode;level?:number;posInSet?:number;setSize?:number;expanded?:boolean;selected?:boolean;disabled?:boolean;busy?:boolean;tabIndex?:number;onKeyDown?:KeyboardEventHandler<HTMLLIElement>;onFocus?:FocusEventHandler<HTMLLIElement>;onClick?:MouseEventHandler<HTMLLIElement>;ref?:Ref<HTMLLIElement>};
export function TreeItem({label,children,group,controls,status,level=1,posInSet=1,setSize=1,expanded,selected,disabled,busy,tabIndex=-1,onKeyDown,onFocus,onClick,ref,className,style,'data-testid':testId}:TreeItemProps) {
  return <li role="treeitem" aria-label={label} aria-level={level} aria-posinset={posInSet} aria-setsize={setSize} aria-expanded={expanded} aria-selected={selected} aria-disabled={disabled||undefined} aria-busy={busy||undefined} ref={ref} tabIndex={tabIndex} onKeyDown={onKeyDown} onFocus={onFocus} onClick={onClick} className={cx('nova-tree__item',className)} style={style} data-testid={testId}><div className="nova-tree__row"><span className="nova-tree__content">{children??label}</span><span className="nova-tree__controls">{controls}</span></div>{status}{group}</li>;
}

export function Tree<T,K extends Key>({source,scopeKey,getKey,getLabel,expandedKeys,onExpandedKeysChange,selectedKeys,onSelectedKeysChange,actions,renderItem,maxDepth,disabled=false,readOnly=false,className,style,'data-testid':testId,'aria-label':ariaLabel,'aria-labelledby':labelledBy,ref}:TreeProps<T,K>) {
  const scope=useNovaScope(), strings=treeStrings(scope), transport=source.mode==='lazy'?source.loadChildren:undefined;
  // A wrapper or accessor change is presentation-only. Each transport/scope owns
  // an independent branch map; abandoned ownership is aborted at commit cleanup.
  const owner=useMemo(()=>createBranchOwner<T,K>([scopeKey,source.mode,transport]),[scopeKey,source.mode,transport]);
  const [,refresh]=useReducer((value:number)=>value+1,0);
  const model=buildTree(source,getKey,owner.branches,maxDepth), visible=visibleTree(model.roots,expandedKeys);
  const nodes=useMemo(()=>new Map<K,HTMLLIElement>(),[]), lastFocused=useRef<HTMLLIElement|null>(null), previous=useRef<readonly TreeNode<T,K>[]>([]), latest=useRef({source,getKey,maxDepth});
  const [focused,setFocused]=useState<K|undefined>();
  const focusKey=visible.some(node=>node.key===focused)?focused:visible[0]?.key;
  useEffect(()=>{if(model.error)reportTreeDiagnostic(scope.diagnostics,model.error);},[model.error,scope.diagnostics]);
  useLayoutEffect(()=>{latest.current={source,getKey,maxDepth};});
  useLayoutEffect(()=>{
    owner.activate();
    return ()=>owner.dispose();
  },[owner]);

  const load=(node:TreeNode<T,K>)=>{
    if(!transport||!owner.isActive()||disabled||!node.branch||owner.branches.has(node.key))return;
    const controller=new AbortController(), generation=owner.nextGeneration();
    const entry:Branch<T>={status:'loading',controller,generation}; owner.branches.set(node.key,entry); refresh();
    const current=()=>owner.isActive()&&!controller.signal.aborted&&owner.branches.get(node.key)===entry&&entry.generation===generation;
    let work:Promise<readonly T[]>;
    try {work=transport(node.item,{signal:controller.signal});} catch {work=Promise.reject();}
    void Promise.resolve(work).then(children=>{
      if(!current())return;
      const candidate=new Map(owner.branches);candidate.set(node.key,{...entry,status:'ready',children});
      const inputs=latest.current,checked=buildTree(inputs.source,inputs.getKey,candidate,inputs.maxDepth);
      if(checked.error){reportTreeDiagnostic(scope.diagnostics,checked.error);entry.status='error';}
      else {entry.status='ready';entry.children=children;}
      refresh();
    },()=>{if(current()){entry.status='error';refresh();}});
  };
  useLayoutEffect(()=>{
    const active=new Set(visible.filter(node=>node.branch&&expandedKeys.includes(node.key)&&!disabled).map(node=>node.key));
    for(const [key,branch] of owner.branches)if(branch.status==='loading'&&!active.has(key)){branch.controller.abort();owner.branches.delete(key);}
    if(!model.error)for(const node of visible)if(active.has(node.key))load(node);
    // Restore focus only when the previously focused item itself was removed.
    const last=lastFocused.current;
    if(last&&!last.isConnected&&last.ownerDocument.activeElement===last.ownerDocument.body){
      let ancestor=previous.current.find(node=>nodes.get(node.key)===last||node.key===focused)?.parent;
      while(ancestor&&!visible.some(node=>node.key===ancestor?.key))ancestor=ancestor.parent;
      const next=ancestor?.key??focusKey;if(next!==undefined)nodes.get(next)?.focus();
    }
    previous.current=visible;
  });

  const focus=(key:K|undefined)=>{if(key!==undefined){setFocused(key);nodes.get(key)?.focus();}};
  const expand=(node:TreeNode<T,K>,next:boolean)=>{
    if(disabled||!node.branch)return;
    // This is a proposal. The commit effect cancels reads only after the
    // controlled consumer accepts collapse, including hidden descendants.
    if(expandedKeys.includes(node.key)!==next)onExpandedKeysChange(next?[...expandedKeys,node.key]:expandedKeys.filter(key=>key!==node.key));
  };
  const select=(node:TreeNode<T,K>)=>{if(disabled||readOnly||!onSelectedKeysChange)return;const keys=selectedKeys??[];onSelectedKeysChange(keys.includes(node.key)?keys.filter(key=>key!==node.key):[...keys,node.key]);};
  const keyDown=(event:Parameters<KeyboardEventHandler<HTMLLIElement>>[0],node:TreeNode<T,K>)=>{
    if(event.target!==event.currentTarget||event.defaultPrevented||disabled)return;
    const index=visible.indexOf(node), open=expandedKeys.includes(node.key);
    const nextKey=scope.dir==='rtl'?'ArrowLeft':'ArrowRight', previousKey=scope.dir==='rtl'?'ArrowRight':'ArrowLeft';
    if(event.key===nextKey){event.preventDefault();if(node.branch){if(!open)expand(node,true);else focus(node.children[0]?.key);}}
    else if(event.key===previousKey){event.preventDefault();if(node.branch&&open)expand(node,false);else focus(node.parent?.key);}
    else if(event.key==='ArrowDown'){event.preventDefault();focus(visible[index+1]?.key);}
    else if(event.key==='ArrowUp'){event.preventDefault();focus(visible[index-1]?.key);}
    else if(event.key==='Home'){event.preventDefault();focus(visible[0]?.key);}
    else if(event.key==='End'){event.preventDefault();focus(visible.at(-1)?.key);}
    else if(event.key===' '||event.key==='Enter'){event.preventDefault();select(node);}
  };
  const render=(node:TreeNode<T,K>):ReactNode=>{
    const label=getLabel(node.item), open=node.branch&&expandedKeys.includes(node.key), branch=owner.branches.get(node.key);
    const message=(template:string)=>treeMessage(template,label);
    const retry:MouseEventHandler<HTMLButtonElement>=event=>{
      if(disabled)return;
      const control=event.currentTarget;
      // Hand off focus before loading removes Retry; completion never moves it.
      if(control.ownerDocument.activeElement===control)focus(node.key);
      owner.branches.delete(node.key);load(node);
    };
    return <TreeItem key={defaultSerializeKey(node.key)} ref={element=>{if(element)nodes.set(node.key,element);else nodes.delete(node.key);}} label={label} level={node.level} posInSet={node.position} setSize={node.size} expanded={node.branch?open:undefined} selected={selectedKeys===undefined?undefined:selectedKeys.includes(node.key)} disabled={disabled} busy={open&&branch?.status==='loading'} tabIndex={!disabled&&node.key===focusKey?0:-1} onFocus={event=>{if(event.target===event.currentTarget){lastFocused.current=event.currentTarget;setFocused(node.key);}}} onKeyDown={event=>keyDown(event,node)} onClick={event=>{if(event.defaultPrevented||event.target!==event.currentTarget&&!((event.target as HTMLElement).closest('.nova-tree__content')))return;event.stopPropagation();focus(node.key);select(node);}}
      controls={<>{node.branch?<Button variant="ghost" size="sm" disabled={disabled} aria-label={message(open?strings.collapse:strings.expand)} onClick={()=>{focus(node.key);expand(node,!open);}}><span aria-hidden="true">{open?'−':'+'}</span></Button>:null}{actions?.length?<ActionMenu data={node.item} actions={actions} label={message(strings.actions)} disabled={disabled||readOnly}/>:null}</>}
      status={<>{node.truncated?<div role="status" className="nova-tree__status">{strings.truncated}</div>:null}{open&&branch?.status==='loading'?<div role="status" className="nova-tree__status">{message(strings.loading)}</div>:null}{open&&branch?.status==='error'?<div className="nova-tree__status"><p role="alert">{message(strings.error)}</p><Button variant="secondary" disabled={disabled} onClick={retry}>{message(strings.retry)}</Button></div>:null}</>}
      group={open&&node.children.length?<ul role="group" className="nova-tree__group">{node.children.map(render)}</ul>:undefined}>{renderItem?renderItem(node.item):label}</TreeItem>;
  };
  return <div className={cx('nova-tree',className)} style={style} data-testid={testId}><ul role="tree" ref={ref} className="nova-tree__root" aria-label={ariaLabel??(labelledBy?undefined:strings.name)} aria-labelledby={labelledBy} aria-multiselectable={selectedKeys!==undefined||onSelectedKeysChange?true:undefined} aria-disabled={disabled||undefined}>{model.roots.map(render)}</ul>{model.error?<p role="alert">{strings.invalid}</p>:model.roots.length===0?<p role="status">{strings.empty}</p>:null}</div>;
}
