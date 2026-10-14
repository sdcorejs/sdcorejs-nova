'use client';
import {createContext,useContext,useEffect,useInsertionEffect,useLayoutEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import type {LoadContext} from '../../types/index.js';
import {abortable} from '../../lib/p1-async-lifecycle.js';
import {useNovaScope} from '../nova/context.js';
export type UnsavedOptions={id:string;scopeKey:string;revision:string|number;dirty:boolean;save?:(ctx:LoadContext)=>Promise<void>;discard?:(ctx:LoadContext)=>void|Promise<void>};
export type LeavePrompt={scopeKey?:string;entries:readonly{id:string;canSave:boolean}[];canSaveAll:boolean;signal:AbortSignal;phase:'prompt'|'saving'|'awaitingAcknowledgement'|'error';errorMessage?:string;choose(decision:'save'|'discard'|'stay'):void};
export type UnsavedChangesProviderProps={children:ReactNode;renderPrompt:(options:LeavePrompt)=>ReactNode;mapError?:(error:unknown)=>string;onError?:(error:unknown)=>void};
type Capture={token:object;id:string;scopeKey:string;revision:string|number;clean:boolean;save?:UnsavedOptions['save'];discard?:UnsavedOptions['discard']};
type Request={scopeKey?:string;captures:Capture[];controller:AbortController;phase:LeavePrompt['phase'];errorMessage?:string;busy:boolean;settled:boolean;saved:Set<object>;discarded:Set<object>;promise:Promise<'leave'|'stay'>;resolve:(result:'leave'|'stay')=>void};
type Settings={fallback:string;mapError?:UnsavedChangesProviderProps['mapError'];onError?:UnsavedChangesProviderProps['onError']};
function createOwner(settings:Settings) {
 const entries=new Map<object,UnsavedOptions>(),listeners=new Set<()=>void>(),queue:Request[]=[];
 let writeTail:Promise<void>|null=null;
 let alive=true,committed=false,configuration=settings,snapshot:{dirty:boolean;prompt:LeavePrompt|null}={dirty:false,prompt:null};
 const selected=(scopeKey:string|undefined)=>[...entries].filter(([,entry])=>entry.dirty&&(scopeKey===undefined||entry.scopeKey===scopeKey));
 const active=(request:Request)=>alive&&!request.settled&&queue.includes(request);
 function publish(){const request=queue[0];snapshot={dirty:[...entries.values()].some(entry=>entry.dirty),prompt:request?{scopeKey:request.scopeKey,entries:request.captures.map(entry=>({id:entry.id,canSave:!!entry.save})),canSaveAll:request.captures.every(entry=>!!entry.save),signal:request.controller.signal,phase:request.phase,errorMessage:request.errorMessage,choose:decision=>choose(request,decision)}:null};for(const listener of listeners)listener();}
 function settle(request:Request,result:'leave'|'stay'){if(request.settled)return;request.settled=true;request.controller.abort();const index=queue.indexOf(request);if(index>=0)queue.splice(index,1);request.resolve(result);if(alive)publish();}
 function reconcile(request:Request):boolean {
  if(!active(request))return false;
  const dirty=selected(request.scopeKey);
  if(dirty.some(([token])=>!request.captures.some(capture=>capture.token===token))){settle(request,'stay');return false;}
  for(const capture of request.captures){const current=entries.get(capture.token);
   if(!current){if(!capture.clean){settle(request,'stay');return false;}continue;}
   if(capture.clean&&current.dirty){settle(request,'stay');return false;}
   if(current.id!==capture.id||current.scopeKey!==capture.scopeKey||current.dirty&&current.revision!==capture.revision){settle(request,'stay');return false;}
   if(!current.dirty)capture.clean=true;
  }
  return true;
 }
 const allClean=(request:Request)=>request.captures.every(capture=>!entries.get(capture.token)?.dirty);
 function changed(){for(const request of [...queue])if(reconcile(request)&&request.phase==='awaitingAcknowledgement'&&allClean(request))settle(request,'leave');publish();}
 function serialize(request:Request,operation:NonNullable<UnsavedOptions['discard']>):Promise<void>{
  const invoke=()=>{if(!reconcile(request)||request.controller.signal.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));try{return Promise.resolve(operation({signal:request.controller.signal}));}catch(error){return Promise.reject(error);}};
  const previous=writeTail;let release!:()=>void;const tail=new Promise<void>(resolve=>{release=resolve;});writeTail=tail;
  const work=previous?previous.then(invoke):invoke();void work.then(release,release);void tail.then(()=>{if(writeTail===tail)writeTail=null;});return work;
 }
 async function write(request:Request,decision:'save'|'discard') {
  try {
   for(const capture of request.captures){
    if(!reconcile(request))return;const entry=entries.get(capture.token);if(!entry?.dirty||(decision==='save'?request.saved:request.discarded).has(capture.token))continue;
    const operation=decision==='save'?capture.save:capture.discard;
    if(operation)await abortable(serialize(request,operation),request.controller.signal);
    if(!reconcile(request))return;(decision==='save'?request.saved:request.discarded).add(capture.token);
   }
   if(!reconcile(request))return;
   if(decision==='discard'||allClean(request)){settle(request,'leave');return;}
   request.phase='awaitingAcknowledgement';publish();
  }catch(error){
   if(!active(request)||request.controller.signal.aborted)return;
   let message=configuration.fallback;
   try{const mapped=configuration.mapError?.(error);if(typeof mapped==='string'&&mapped.trim())message=mapped;}catch{/* Keep the safe localized fallback. */}
   if(!active(request))return;
   request.busy=false;request.phase='error';request.errorMessage=message;
   try{configuration.onError?.(error);}catch{/* Consumer reporting must not orphan the navigation promise. */}
   if(active(request))publish();
  }
 }
 function choose(request:Request,decision:'save'|'discard'|'stay'){
  if(!active(request)||queue[0]!==request)return;
  if(decision==='stay'){settle(request,'stay');return;}if(request.busy||!reconcile(request))return;
  if(allClean(request)){settle(request,'leave');return;}
  if(decision==='save'&&!request.captures.every(entry=>!!entry.save)){settle(request,'stay');return;}
  request.busy=true;request.phase='saving';request.errorMessage=undefined;publish();void write(request,decision);
 }
 function confirm(scopeKey?:string):Promise<'leave'|'stay'> {
  if(!alive||typeof document==='undefined')return Promise.resolve('stay');
  const existing=queue.find(request=>request.scopeKey===scopeKey);if(existing)return existing.promise;
  const dirty=selected(scopeKey);if(!dirty.length)return Promise.resolve('leave');
  let resolve!:Request['resolve'];const promise=new Promise<'leave'|'stay'>(accept=>{resolve=accept;});
  const captures=dirty.map(([token,entry])=>({token,id:entry.id,scopeKey:entry.scopeKey,revision:entry.revision,clean:false,save:entry.save,discard:entry.discard}));
  const request:Request={scopeKey,captures,controller:new AbortController(),phase:'prompt',busy:false,settled:false,saved:new Set(),discarded:new Set(),promise,resolve};queue.push(request);publish();return promise;
 }
 return {
  confirm,update(token:object,entry:UnsavedOptions){const before=entries.get(token);entries.set(token,{...entry});if(!before||before.id!==entry.id||before.scopeKey!==entry.scopeKey||before.dirty!==entry.dirty||before.revision!==entry.revision)changed();},
  remove(token:object){if(entries.delete(token))changed();},
  configure(next:Settings){configuration=next;},
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},snapshot:()=>snapshot,
  markCommitted(){committed=true;alive=true;},markRemoved(){committed=false;alive=false;},
  activate(){alive=committed;},deactivate(){alive=false;for(const request of [...queue])settle(request,'stay');if(committed)alive=true;},
 };
}
type Owner=ReturnType<typeof createOwner>;
const Context=createContext<Owner|null>(null),serverSnapshot={dirty:false,prompt:null};
function useOwner(){const owner=useContext(Context);if(!owner)throw Error('Nova UnsavedChangesProvider is required.');return owner;}
export function useUnsavedChanges(options:UnsavedOptions):void {const owner=useOwner(),[token]=useState(()=>({}));useLayoutEffect(()=>{owner.update(token,options);});useLayoutEffect(()=>()=>owner.remove(token),[owner,token]);}
export function useConfirmLeave():(scopeKey?:string)=>Promise<'leave'|'stay'>{return useOwner().confirm;}
export function UnsavedChangesProvider({children,renderPrompt,mapError,onError}:UnsavedChangesProviderProps){
 const scope=useNovaScope(),[owner]=useState(()=>createOwner({fallback:scope.strings.feedback.errorDefault,mapError,onError}));
 const state=useSyncExternalStore(owner.subscribe,owner.snapshot,()=>serverSnapshot);
 useLayoutEffect(()=>owner.configure({fallback:scope.strings.feedback.errorDefault,mapError,onError}),[owner,scope.strings.feedback.errorDefault,mapError,onError]);
 useInsertionEffect(()=>{owner.markCommitted();return owner.markRemoved;},[owner]);
 useLayoutEffect(()=>{owner.activate();return owner.deactivate;},[owner]);
 useEffect(()=>{if(!state.dirty)return;const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);},[state.dirty]);
 return <Context value={owner}>{children}{state.prompt&&renderPrompt(state.prompt)}</Context>;
}
