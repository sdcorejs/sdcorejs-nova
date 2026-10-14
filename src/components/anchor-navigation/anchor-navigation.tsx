'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx.js';
import { isEmptyLabel } from '../../lib/accessible-name.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import { FieldControlError } from '../field/field.js';
import type { ReactNode, RefObject } from 'react';
import type { SurfaceProps } from '../../types/index.js';
export type AnchorItem={id:string;title:string};
export type ActiveAnchorProps={activeId:string|null;defaultActiveId?:never;onActiveIdChange:(id:string|null)=>void}|{activeId?:never;defaultActiveId?:string|null;onActiveIdChange?:(id:string|null)=>void};
export type AnchorNavigationProps=ActiveAnchorProps&SurfaceProps&{items:readonly AnchorItem[];label:string;scrollRootRef?:RefObject<HTMLElement|null>;offsetPx?:number;updateHash?:boolean};
export type AnchorSectionProps=SurfaceProps&{id:string;title:ReactNode;headingLevel?:2|3|4;children:ReactNode};
export function AnchorNavigation({items,label,activeId,defaultActiveId,onActiveIdChange,scrollRootRef,offsetPx=0,updateHash=false,className,style,'data-testid':testId}:AnchorNavigationProps){
  const report=useDiagnostics('AnchorNavigation');const [node,setNode]=useState<HTMLElement|null>(null);
  const [current,setCurrent]=useControllableValue<string|null>({value:activeId,defaultValue:defaultActiveId,onValueChange:onActiveIdChange,fallback:null,report});
  const duplicate=new Set(items.map(item=>item.id)).size!==items.length;
  const unnamed=isEmptyLabel(label)||items.some(item=>isEmptyLabel(item.title));
  useEffect(()=>{if(duplicate)report('NOVA_ANCHOR_DUPLICATE_ID');},[duplicate,report]);
  const offset=Number.isFinite(offsetPx)?offsetPx:0;
  const latest=useRef({current,setCurrent,report});
  const binding=useRef<{root:HTMLElement|null;rootRef:typeof scrollRootRef;doc:Document;node:HTMLElement;identity:string;offset:number;cleanup:()=>void;bind:()=>void}|null>(null);
  const identity=JSON.stringify(items.map(item=>item.id));
  useLayoutEffect(()=>{
    latest.current={current,setCurrent,report};
    const previous=binding.current;
    if(previous&&(!node||duplicate||unnamed||previous.rootRef!==scrollRootRef||previous.root!==(scrollRootRef?.current??null)||previous.node!==node||previous.identity!==identity||previous.offset!==offset)){
      previous.cleanup();binding.current=null;
    }
  });
  useEffect(()=>{
    if(!node||duplicate||unnamed)return;
    const configure=()=>{
    const root=scrollRootRef?.current??null,doc=root?.ownerDocument??node.ownerDocument;
    const previous=binding.current;if(previous&&previous.root===root&&previous.rootRef===scrollRootRef&&previous.doc===doc&&previous.node===node&&previous.identity===identity&&previous.offset===offset)return;
    previous?.cleanup();
    const win=doc.defaultView;
    const watched=new Map<string,HTMLElement>(),visible=new Set<string>();let disposed=false;
    const choose=()=>{if(disposed)return;const positions=[...visible].flatMap(id=>{const target=watched.get(id);return target?.isConnected&&target.id===id?[{id,top:target.getBoundingClientRect().top}]:[];});const next=positions.sort((a,b)=>a.top-b.top)[0]?.id??null;if(next!==latest.current.current)latest.current.setCurrent(next);};
    const observer=win?.IntersectionObserver?new win.IntersectionObserver(entries=>{
      if(disposed)return;
      for(const entry of entries){const match=[...watched].find(([,target])=>target===entry.target);if(!match)continue;if(entry.isIntersecting&&match[1].isConnected&&match[1].id===match[0])visible.add(match[0]);else visible.delete(match[0]);}choose();
    },{root,rootMargin:`${-offset}px 0px 0px 0px`,threshold:0}):null;
    const bind=()=>{
      const next=new Map<string,HTMLElement>();let removedVisible=false;
      for(const item of items){const matches=Array.from(doc.querySelectorAll<HTMLElement>('[id]')).filter(target=>target.id===item.id);if(matches.length>1){latest.current.report('NOVA_ANCHOR_DUPLICATE_ID');continue;}const target=matches[0];if(!target||(root&&!root.contains(target))){latest.current.report('NOVA_ANCHOR_MISSING_ID');continue;}next.set(item.id,target);}
      for(const [id,target] of watched){if(next.get(id)!==target){observer?.unobserve(target);watched.delete(id);removedVisible=visible.delete(id)||removedVisible;}}
      for(const [id,target] of next){if(!watched.has(id)){watched.set(id,target);observer?.observe(target);}}
      if(removedVisible)choose();
    };
    bind();const changes=win?.MutationObserver?new win.MutationObserver(()=>{if(disposed)return;configure();binding.current?.bind();}):null;if(changes){for(const body of new Set([doc.body,node.ownerDocument.body]))if(body)changes.observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['id']});}
    const cleanup=()=>{disposed=true;changes?.disconnect();observer?.disconnect();watched.clear();visible.clear();};
    binding.current={root,rootRef:scrollRootRef,doc,node,identity,offset,cleanup,bind};
    };configure();
  });
  useLayoutEffect(()=>()=>{binding.current?.cleanup();binding.current=null;},[]);
  if(unnamed)return <FieldControlError code="NOVA_ACCESSIBLE_NAME_EMPTY" component="AnchorNavigation"/>;
  if(duplicate)return <FieldControlError code="NOVA_ANCHOR_DUPLICATE_ID" component="AnchorNavigation"/>;
  return <nav ref={setNode} className={cx('nova-anchor-navigation',className)} style={style} data-testid={testId} aria-label={label}><ol className="nova-anchor-navigation__list">{items.map(item=><li key={item.id}><a href={`#${encodeURIComponent(item.id)}`} aria-current={current===item.id?'location':undefined} className="nova-anchor-navigation__link" onClick={event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();const root=scrollRootRef?.current??null,doc=root?.ownerDocument??event.currentTarget.ownerDocument,win=doc.defaultView;
    const matches=Array.from(doc.querySelectorAll<HTMLElement>('[id]')).filter(target=>target.id===item.id);if(matches.length!==1){report(matches.length>1?'NOVA_ANCHOR_DUPLICATE_ID':'NOVA_ANCHOR_MISSING_ID');return;}const target=matches[0]!;if(root&&!root.contains(target)){report('NOVA_ANCHOR_MISSING_ID');return;}
    const heading=target.querySelector<HTMLElement>('[data-nova-anchor-heading]')??target.querySelector<HTMLElement>('h1,h2,h3,h4,h5,h6')??target;heading.focus({preventScroll:true});
    const behavior:ScrollBehavior=win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
    if(root)root.scrollTo({top:root.scrollTop+target.getBoundingClientRect().top-root.getBoundingClientRect().top-root.clientTop-offset,behavior});else win?.scrollTo({top:(win.scrollY??0)+target.getBoundingClientRect().top-offset,behavior});
    if(current!==item.id)setCurrent(item.id);if(updateHash)win?.history.pushState(win.history.state,'',`#${encodeURIComponent(item.id)}`);
  }}>{item.title}</a></li>)}</ol></nav>;
}
export function AnchorSection({id,title,headingLevel=2,children,className,style,'data-testid':testId}:AnchorSectionProps){const headingId=useId();const Heading=`h${headingLevel}` as 'h2'|'h3'|'h4';return <section id={id} aria-labelledby={headingId} className={cx('nova-anchor-section',className)} style={style} data-testid={testId}><Heading id={headingId} tabIndex={-1} data-nova-anchor-heading="">{title}</Heading>{children}</section>;}
