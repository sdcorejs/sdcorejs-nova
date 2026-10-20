'use client';
import { createContext, useCallback, useContext, useId, useInsertionEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { useAsyncAction } from '../../hooks/async-action/async-action.js';
import { useNovaScope } from '../nova/context.js';
import type { NovaScope } from '../nova/context.js';
import { PortalScope } from '../nova/portal-scope.js';
import { en } from '../../i18n/en.js';
import { Icon } from '../../lib/icons.js';
import type { LoadContext } from '../../types/index.js';
const FOCUSABLE='a[href],button,input:not([type="hidden"]),select,textarea,[tabindex],[contenteditable="true"]';
function reachable(element:HTMLElement|null):element is HTMLElement {
 if(!element?.isConnected||element.tabIndex<0||element.matches(':disabled')||element.closest('[hidden],[inert]')||element.hasAttribute('data-base-ui-focus-guard')||element.hasAttribute('data-floating-ui-focus-guard'))return false;
 for(let node:HTMLElement|null=element;node;node=node.parentElement){const style=node.ownerDocument.defaultView?.getComputedStyle(node);if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse')return false;}return true;
}
export type ToastInput={id?:string;tone?:'info'|'success'|'warning'|'error';title:string;description?:string;durationMs?:number|null;announcement?:'polite'|'assertive';action?:{label:string;onAction:(ctx:LoadContext)=>void|Promise<void>}};
export type ToastProviderProps={children:ReactNode;maxVisible?:number;offset?:string;onActionError?:(error:unknown,id:string)=>string|void};
type ToastAPI={show:(input:ToastInput)=>string;update:(id:string,patch:Partial<Omit<ToastInput,'id'>>)=>boolean;dismiss:(id:string)=>boolean};
type Entry={root:HTMLDivElement|null;opener:HTMLElement|null;id:string;baseId:string;order:number;input:ToastInput;visible:boolean;remaining:number|null;startedAt:number;timer:number|null;timerVersion:number;busy:boolean;actionVersion:number;cancelAction?:()=>void};
type Owner={recovery:{root:HTMLElement;from:HTMLElement;opener:HTMLElement|null;id:string}|null;entries:Map<string,Entry>;alive:boolean;committed:boolean;viewport:HTMLDivElement|null;sequence:number;doc:Document|null;detachVisibility:(()=>void)|null;hovered:boolean;focused:boolean;hidden:boolean;limit:number;scope:NovaScope;onActionError:ToastProviderProps['onActionError']};
const ToastContext=createContext<ToastAPI|null>(null);
const limitValue=(value:number|undefined)=>Number.isFinite(value)&&value!>0?Math.max(1,Math.floor(value!)):5;
const duration=(value:number|null|undefined)=>value===null?null:Number.isFinite(value)&&value!>=0?value!:5000;
export function useToast():ToastAPI{const api=useContext(ToastContext);if(!api)throw Error('Nova ToastProvider is required.');return api;}
export function ToastProvider(props:ToastProviderProps){const scope=useNovaScope();return <BaseToast.Provider timeout={0} limit={limitValue(props.maxVisible)}><ToastOwner {...props} scope={scope}/></BaseToast.Provider>;}
function ToastOwner({children,maxVisible,offset,onActionError,scope}:ToastProviderProps&{scope:NovaScope}){
  const prefix=useId(),{toasts,add,update:baseUpdate,close}=BaseToast.useToastManager<{entry:Entry}>();
  const [owner]=useState<Owner>(()=>({recovery:null,entries:new Map(),alive:true,committed:false,viewport:null,sequence:0,doc:null,detachVisibility:null,hovered:false,focused:false,hidden:false,limit:limitValue(maxVisible),scope,onActionError}));
  const [viewport,setViewport]=useState<HTMLDivElement|null>(null),[,publish]=useState(0);
  const methods=useMemo(()=>{
    const paused=()=>owner.hovered||owner.focused||owner.hidden;
    const stop=(entry:Entry)=>{entry.timerVersion++;if(entry.timer!==null){owner.doc?.defaultView?.clearTimeout(entry.timer);entry.timer=null;entry.remaining=entry.remaining===null?null:Math.max(0,entry.remaining-(Date.now()-entry.startedAt));}};
    const start=(entry:Entry)=>{
      if(!owner.alive||!entry.visible||entry.busy||paused()||entry.remaining===null||entry.timer!==null||!owner.doc?.defaultView)return;
      const version=++entry.timerVersion;entry.startedAt=Date.now();entry.timer=owner.doc.defaultView.setTimeout(()=>{if(!owner.alive||owner.entries.get(entry.id)!==entry||entry.timerVersion!==version||entry.busy||paused())return;entry.timer=null;entry.remaining=0;dismiss(entry.id);},entry.remaining);
    };
    const syncTimers=()=>{for(const entry of owner.entries.values()){if(paused()||entry.busy||!entry.visible)stop(entry);else start(entry);}};
    const format=(entry:Entry)=>({id:entry.baseId,title:entry.input.title,description:entry.input.description,type:entry.input.tone??'info',priority:entry.input.announcement==='assertive'?'high' as const:'low' as const,timeout:0,data:{entry},onClose:()=>{if(owner.entries.get(entry.id)===entry&&entry.visible)dismiss(entry.id);}});
    function pump(){if(!owner.alive)return;let count=0;for(const entry of owner.entries.values()){if(!entry.visible)continue;if(count++>=owner.limit){entry.visible=false;stop(entry);entry.actionVersion++;entry.busy=false;close(entry.baseId);entry.cancelAction?.();}}count=[...owner.entries.values()].filter(entry=>entry.visible).length;for(const entry of owner.entries.values()){if(count>=owner.limit)break;if(entry.visible)continue;entry.visible=true;count++;add(format(entry));start(entry);}publish(value=>value+1);}
    function dismiss(id:string){if(!owner.alive)return false;const entry=owner.entries.get(id);if(!entry)return false;const focused=owner.doc?.activeElement as HTMLElement|null;const root=entry.root;if(focused&&root?.contains(focused)&&owner.viewport?.contains(root))owner.recovery={root,from:focused,opener:entry.opener,id};owner.entries.delete(id);stop(entry);entry.actionVersion++;const cancel=entry.cancelAction;if(entry.visible)close(entry.baseId);pump();cancel?.();return true;}
    function update(id:string,patch:Partial<Omit<ToastInput,'id'>>){if(!owner.alive)return false;const entry=owner.entries.get(id);if(!entry)return false;const previous=entry.input;const actionChanged=Object.hasOwn(patch,'action')&&patch.action!==previous.action;const cancel=actionChanged?entry.cancelAction:undefined;if(actionChanged){entry.actionVersion++;entry.busy=false;}entry.input={...previous,...patch,id};if(Object.hasOwn(patch,'durationMs')){stop(entry);entry.remaining=duration(patch.durationMs);}const visual=entry.input.title!==previous.title||entry.input.description!==previous.description||entry.input.tone!==previous.tone||entry.input.announcement!==previous.announcement;if(entry.visible&&visual)baseUpdate(entry.baseId,format(entry));publish(value=>value+1);syncTimers();cancel?.();return true;}
    function show(input:ToastInput){const id=input.id??prefix+':'+(++owner.sequence);if(!owner.alive||typeof document==='undefined')return id;if(owner.entries.has(id)){const {id:ignored,...patch}=input;void ignored;update(id,patch);return id;}const order=++owner.sequence;const focus=owner.doc?.activeElement as HTMLElement|null;const entry:Entry={root:null,opener:focus&&focus!==owner.doc?.body&&!owner.viewport?.contains(focus)?focus:null,id,baseId:prefix+':'+order,order,input:{...input,id},visible:false,remaining:duration(input.durationMs),startedAt:0,timer:null,timerVersion:0,busy:false,actionVersion:0};owner.entries.set(id,entry);pump();return id;}
    function setDocument(doc:Document|null,node:HTMLDivElement|null){if(owner.viewport!==node){owner.viewport=node;owner.hovered=false;owner.focused=!!node&&node.contains(doc?.activeElement??null);}if(owner.doc===doc){syncTimers();return;}for(const entry of owner.entries.values())stop(entry);owner.detachVisibility?.();owner.doc=doc;owner.hidden=doc?.hidden??false;if(doc){const changed=()=>{owner.hidden=doc.hidden;syncTimers();};doc.addEventListener('visibilitychange',changed);owner.detachVisibility=()=>doc.removeEventListener('visibilitychange',changed);}else owner.detachVisibility=null;syncTimers();}
    function begin(entry:Entry){if(!owner.alive||owner.entries.get(entry.id)!==entry||entry.busy)return null;entry.busy=true;stop(entry);return ++entry.actionVersion;}
    function finish(entry:Entry,version:number){if(!owner.alive||owner.entries.get(entry.id)!==entry||entry.actionVersion!==version)return false;entry.busy=false;start(entry);return true;}
    function registerAction(entry:Entry,cancel:()=>void){if(owner.entries.get(entry.id)!==entry)return;entry.cancelAction=cancel;return()=>{if(entry.cancelAction===cancel)entry.cancelAction=undefined;};}
    function pause(kind:'hovered'|'focused',value:boolean){owner[kind]=value;syncTimers();}
    function dispose(){owner.alive=false;owner.recovery=null;owner.detachVisibility?.();owner.detachVisibility=null;const entries=[...owner.entries.values()];owner.entries.clear();for(const entry of entries){stop(entry);entry.actionVersion++;if(entry.visible)close(entry.baseId);entry.cancelAction?.();}owner.doc=null;owner.viewport=null;owner.hovered=false;owner.focused=false;owner.hidden=false;}
    return {assignRoot:(entry:Entry,node:HTMLDivElement|null)=>{entry.root=node;},api:{show,update,dismiss},pump,setDocument,begin,finish,registerAction,pause,dispose};
  },[owner,prefix,add,baseUpdate,close]);
  useLayoutEffect(()=>{
    const recovery=owner.recovery,doc=owner.doc;if(!recovery||!doc)return;owner.recovery=null;
    const active=doc.activeElement;if(active!==doc.body&&active!==recovery.from&&!recovery.root.contains(active))return;
    const next=[...owner.entries.values()].filter(entry=>entry.visible&&entry.root).flatMap(entry=>[...entry.root!.querySelectorAll<HTMLElement>(FOCUSABLE)]).find(reachable);
    const target=next??(reachable(recovery.opener)?recovery.opener:[...doc.querySelectorAll<HTMLElement>(FOCUSABLE)].find(node=>!owner.viewport?.contains(node)&&reachable(node)));
    target?.focus();
  });
  useLayoutEffect(()=>{owner.scope=scope;owner.onActionError=onActionError;owner.limit=limitValue(maxVisible);methods.pump();},[owner,scope,onActionError,maxVisible,methods]);
  useLayoutEffect(()=>{methods.setDocument(viewport?.ownerDocument??null,viewport);},[viewport,methods]);
  // Commit lifetime is distinct from StrictMode's simulated layout replay.
  // This effect only marks ownership; layout cleanup owns stores/actions/timers.
  useInsertionEffect(()=>{owner.committed=true;owner.alive=true;return()=>{owner.committed=false;owner.alive=false;};},[owner]);
  useLayoutEffect(()=>{owner.alive=owner.committed;return()=>{methods.dispose();if(owner.committed)owner.alive=true;};},[owner,methods]);
  const ordered=[...toasts].filter(toast=>toast.data?.entry).sort((a,b)=>a.data!.entry.order-b.data!.entry.order);
  const surfaceStyle=offset===undefined?undefined:{insetBlockEnd:'calc('+offset+' + env(safe-area-inset-bottom, 0px))'} as CSSProperties;
  return <ToastContext.Provider value={methods.api}>{children}<PortalScope>{(container,portalRef)=><BaseToast.Portal container={container} ref={portalRef}><BaseToast.Viewport ref={setViewport} className="nova-toast-viewport" style={surfaceStyle} aria-label={scope.strings.feedback.notifications??en.feedback.notifications} onMouseEnter={()=>methods.pause('hovered',true)} onMouseLeave={()=>methods.pause('hovered',false)} onFocusCapture={()=>methods.pause('focused',true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))methods.pause('focused',false);}}>{ordered.map(toast=><ToastView key={toast.id} toast={toast} entry={toast.data!.entry} owner={owner} methods={methods}/>)}</BaseToast.Viewport></BaseToast.Portal>}</PortalScope></ToastContext.Provider>;
}
// Decorative tone glyphs (16×16, 1.5 stroke); the title/description carry the meaning.
const TONE_PATHS={info:'M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 7.25v3.75M8 5h.01',success:'M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM5.25 8.25l2 2 3.5-4',warning:'M8 2.25l6 10.5H2zM8 6.5v2.75M8 11h.01',error:'M8 1.75a6.25 6.25 0 1 1 0 12.5 6.25 6.25 0 0 1 0-12.5zM8 4.75v3.75M8 11h.01'} as const;
function ToneIcon({tone}:{tone:NonNullable<ToastInput['tone']>}){return <svg className="nova-toast__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={TONE_PATHS[tone]??TONE_PATHS.info}/></svg>;}
function ToastView({toast,entry,owner,methods}:{toast:BaseToast.Root.ToastObject<{entry:Entry}>;entry:Entry;owner:Owner;methods:{assignRoot:(entry:Entry,node:HTMLDivElement|null)=>void;begin:(entry:Entry)=>number|null;finish:(entry:Entry,version:number)=>boolean;registerAction:(entry:Entry,cancel:()=>void)=>(()=>void)|undefined}}){
  const assignRoot=useCallback((node:HTMLDivElement|null)=>methods.assignRoot(entry,node),[methods,entry]);
  const {run,pending,cancel}=useAsyncAction(async(ctx:LoadContext)=>{await entry.input.action?.onAction(ctx);});
  const [failure,setFailure]=useState<{entry:Entry;version:number;message:string|undefined}|null>(null);
  useLayoutEffect(()=>methods.registerAction(entry,cancel),[entry,cancel,methods]);
  const message=failure?.entry===entry&&failure.version===entry.actionVersion?(failure.message??owner.scope.strings.feedback.errorDefault):undefined;
  return <BaseToast.Root ref={assignRoot} toast={toast} className="nova-toast" data-nova-toast-id={entry.id} data-tone={entry.input.tone??'info'} swipeDirection={[]}><ToneIcon tone={entry.input.tone??'info'}/><div className="nova-toast__content"><BaseToast.Title className="nova-toast__title">{entry.input.title}</BaseToast.Title>{entry.input.description&&<BaseToast.Description className="nova-toast__description">{entry.input.description}</BaseToast.Description>}{message&&<span role="status" className="nova-toast__error">{message}</span>}{entry.input.action&&<div className="nova-toast__controls"><BaseToast.Action type="button" className="nova-toast__action" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={event=>{if(pending){event.preventDefault();return;}const version=methods.begin(entry);if(version===null){event.preventDefault();return;}setFailure(null);void run().then(()=>{methods.finish(entry,version);},error=>{if(!methods.finish(entry,version)||error instanceof DOMException&&error.name==='AbortError')return;let safe:string|void;try{safe=owner.onActionError?.(error,entry.id);}catch{safe=undefined;}if(owner.alive&&owner.entries.get(entry.id)===entry&&entry.actionVersion===version)setFailure({entry,version,message:typeof safe==='string'&&safe.trim()?safe:undefined});});}}>{entry.input.action.label}</BaseToast.Action></div>}</div><BaseToast.Close type="button" aria-hidden={false} className="nova-toast__close" aria-label={owner.scope.strings.feedback.dismiss}><Icon name="close"/></BaseToast.Close></BaseToast.Root>;
}
