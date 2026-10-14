'use client';
import { Tabs as Primitive } from '@base-ui/react/tabs';
import { Fragment, Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics } from '../../providers/nova/context.js';
import type { SurfaceProps, ValueProps } from '../../types/index.js';
export type TabsProps=ValueProps<string>&SurfaceProps&{activationMode?:'automatic'|'manual';orientation?:'horizontal'|'vertical';children:ReactNode};
export type TabListProps=SurfaceProps&{label:string;children:ReactNode};
export type TabProps=SurfaceProps&{value:string;disabled?:boolean;children:ReactNode};
export type TabPanelProps=SurfaceProps&{value:string;keepMounted?:boolean;children:ReactNode};
type Entry={value:string;disabled:boolean};
type TabsScope={id:string;selected:string|null;activationMode:'automatic'|'manual';register:(node:HTMLElement,value:string,disabled:boolean)=>()=>void};
const Context=createContext<TabsScope|null>(null);
function useTabs(){const scope=useContext(Context);if(!scope)throw new Error('Nova tab parts require Tabs.');return scope;}
// Known compound elements provide deterministic server fallback without running
// consumer components. Mounted node registration handles opaque custom parts.
function collect(children:ReactNode):Entry[]{
  const entries:Entry[]=[];
  Children.forEach(children,child=>{
    if(!isValidElement<{children?:ReactNode;value?:string;disabled?:boolean}>(child))return;
    if(child.type===Tabs)return;
    if(child.type===Tab){entries.push({value:child.props.value!,disabled:!!child.props.disabled});return;}
    if(child.type===TabList || child.type===Fragment || typeof child.type==='string')entries.push(...collect(child.props.children));
  });return entries;
}
export function Tabs({value,defaultValue,onValueChange,activationMode='automatic',orientation='horizontal',children,className,style,'data-testid':testId}:TabsProps){
  const id=useId(),report=useDiagnostics('Tabs'),seed=useMemo(()=>collect(children),[children]);
  const nodes=useRef(new Map<HTMLElement,Entry>());
  const [rootNode,setRootNode]=useState<HTMLDivElement|null>(null);
  const focusProposal=useRef<{value:string;node:Node|null}|null>(null);
  const [mountedEntries,setMountedEntries]=useState<{ready:boolean;entries:Entry[]}>({ready:false,entries:[]});
  const syncNodes=useCallback(()=>{
    const entries=[...nodes.current].filter(([node])=>node.isConnected).sort(([a],[b])=>a.compareDocumentPosition(b)&4?-1:1).map(([,entry])=>entry);
    setMountedEntries(previous=>previous.ready && previous.entries.length===entries.length && entries.every((entry,index)=>entry.value===previous.entries[index]?.value && entry.disabled===previous.entries[index]?.disabled)?previous:{ready:true,entries});
  },[]);
  const register=useCallback((node:HTMLElement,value:string,disabled:boolean)=>{
    nodes.current.set(node,{value,disabled});syncNodes();
    return()=>{nodes.current.delete(node);syncNodes();};
  },[syncNodes]);
  const entries=mountedEntries.ready?mountedEntries.entries:seed;
  const first=entries.find(entry=>!entry.disabled)?.value ?? null;
  const [current,setCurrent]=useControllableValue({value,defaultValue,onValueChange,fallback:seed.find(entry=>!entry.disabled)?.value ?? '',report});
  const valid=entries.some(entry=>entry.value===current && !entry.disabled);
  const selected=entries.length?(valid?current:first):(mountedEntries.ready?null:(value!==undefined || defaultValue!==undefined)?current:null);
  const invalid=(mountedEntries.ready || entries.length>0) && !valid && (current!=='' || value!==undefined || defaultValue!==undefined);
  useEffect(()=>{if(invalid)report('NOVA_TABS_UNKNOWN_VALUE');},[invalid,report]);
  // Reordering nodes preserves identities but can change the fallback order.
  useLayoutEffect(()=>{syncNodes();},[children,syncNodes]);
  // Opaque consumer components may reorder memoized tab elements without a
  // ref replay or this root rendering. Observe only this root's DOM commits;
  // equality checks retain state for unrelated panel/nested-root mutations.
  useLayoutEffect(()=>{
    const Observer=rootNode?.ownerDocument.defaultView?.MutationObserver;
    if(!rootNode || !Observer)return;
    const observer=new Observer(()=>syncNodes());
    observer.observe(rootNode,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[rootNode,syncNodes]);
  const scope=useMemo(()=>({id,selected,activationMode,register}),[id,selected,activationMode,register]);
  return <Context.Provider value={scope}><Primitive.Root ref={setRootNode} value={selected} orientation={orientation}
    onPointerDownCapture={()=>{focusProposal.current=null;}} onKeyDownCapture={()=>{focusProposal.current=null;}}
    onValueChange={(next,details)=>{
      if(typeof next!=='string' || details.reason!=='none')return;
      const previous=focusProposal.current,event=details.event;
      focusProposal.current=null;
      // Automatic focus and the following click are one selection gesture.
      // A new pointer/key gesture clears this marker before another proposal.
      if(event.type==='click' && previous?.value===next && previous.node?.contains(event.target as Node|null))return;
      if(event.type==='focusin' || event.type==='focus')focusProposal.current={value:next,node:event.target as Node|null};
      setCurrent(next);
    }} className={cx('nova-tabs',className)} style={style} data-testid={testId}>{children}</Primitive.Root></Context.Provider>;
}
export function TabList({label,children,className,...surface}:TabListProps){const scope=useTabs();return <Primitive.List aria-label={label} activateOnFocus={scope.activationMode==='automatic'} className={cx('nova-tabs__list',className)} {...surface}>{children}</Primitive.List>;}
export function Tab({value,disabled=false,children,className,...surface}:TabProps){
  const {id,register}=useTabs();
  const registerRef=useCallback((node:HTMLElement|null)=>node?register(node,value,disabled):undefined,[register,value,disabled]);
  if(disabled)return <button ref={registerRef} id={`${id}-tab-${encodeURIComponent(value)}`} aria-controls={`${id}-panel-${encodeURIComponent(value)}`} role="tab" aria-selected={false} aria-disabled="true" disabled tabIndex={-1} type="button" className={cx('nova-tabs__tab',className)} {...surface}>{children}</button>;
  return <Primitive.Tab ref={registerRef} id={`${id}-tab-${encodeURIComponent(value)}`} aria-controls={`${id}-panel-${encodeURIComponent(value)}`} value={value} disabled={disabled} className={cx('nova-tabs__tab',className)} {...surface}>{children}</Primitive.Tab>;
}
export function TabPanel({value,keepMounted=false,children,className,...surface}:TabPanelProps){
  const scope=useTabs(),id=scope.id,active=scope.selected===value;
  if(!active && !keepMounted)return null;
  return <Primitive.Panel id={`${id}-panel-${encodeURIComponent(value)}`} aria-labelledby={`${id}-tab-${encodeURIComponent(value)}`} value={value} keepMounted={keepMounted} hidden={!active} inert={!active} tabIndex={active?0:-1} className={cx('nova-tabs__panel',className)} {...surface}>{children}</Primitive.Panel>;
}
