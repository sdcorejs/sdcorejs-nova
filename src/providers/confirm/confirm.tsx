'use client';
import { createContext, useCallback, useContext, useId, useInsertionEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AlertDialog as Primitive } from '@base-ui/react/alert-dialog';
import { reportDiagnostic } from '../../lib/diagnostics.js';
import { useNovaScope } from '../nova/context.js';
import type { NovaScope } from '../nova/context.js';
import { PortalScope } from '../nova/portal-scope.js';
import { en } from '../../i18n/en.js';
export type ConfirmOptions={title:string;description?:string;confirmLabel?:string;cancelLabel?:string;tone?:'neutral'|'danger';signal?:AbortSignal};
export type ConfirmResult='confirmed'|'cancelled';
export type ConfirmProviderProps={children:ReactNode};
type Confirm=(options:ConfirmOptions)=>Promise<ConfirmResult>;
type Request={id:number;options:ConfirmOptions;settled:boolean;resolve:(result:ConfirmResult)=>void;detach:()=>void;opener:HTMLElement|null;document:Document|null;popup:HTMLDivElement|null};
type Owner={queue:Request[];sequence:number;alive:boolean;committed:boolean;scope:NovaScope};
const Context=createContext<Confirm|null>(null);
const FOCUSABLE='a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex],[contenteditable="true"]';
function reachable(element:HTMLElement|null):element is HTMLElement{
 if(!element||!element.isConnected||!element.matches(FOCUSABLE)||element.matches(':disabled')||element.closest('[hidden],[inert]')||element.hasAttribute('data-base-ui-focus-guard')||element.hasAttribute('data-floating-ui-focus-guard'))return false;
 for(let node:HTMLElement|null=element;node;node=node.parentElement){const style=node.ownerDocument.defaultView?.getComputedStyle(node);if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse')return false;}return true;
}
function activeElement(doc:Document):HTMLElement|null{let active=doc.activeElement;while(active?.tagName==='IFRAME'){const inner=(active as HTMLIFrameElement).contentDocument?.activeElement;if(!inner||inner===active)break;active=inner;}return active&&active!==active.ownerDocument.body&&'focus' in active?active as HTMLElement:null;}
export function useConfirm():Confirm{const value=useContext(Context);if(!value)throw Error('Nova ConfirmProvider is required.');return value;}
function createOwner(scope:NovaScope){
 const owner:Owner={queue:[],sequence:0,alive:true,committed:false,scope};
 const listeners=new Set<()=>void>();
 const mountedPopups=new Map<Request,HTMLDivElement>();
 const emit=()=>{for(const listener of listeners)listener();};
  function settle(request:Request,result:ConfirmResult){if(request.settled||!owner.queue.includes(request))return;request.settled=true;owner.queue=owner.queue.filter(item=>item!==request);request.detach();if(owner.alive)emit();request.resolve(result);}
  function confirm(options:ConfirmOptions){if(!owner.alive)return Promise.resolve('cancelled' as const);if(typeof document==='undefined'){reportDiagnostic(owner.scope.diagnostics,'NOVA_CONFIRM_SERVER_CALL','ConfirmProvider');return Promise.resolve('cancelled' as const);}if(typeof options.title!=='string'||!options.title.trim()){reportDiagnostic(owner.scope.diagnostics,'NOVA_ACCESSIBLE_NAME_EMPTY','ConfirmProvider');return Promise.resolve('cancelled' as const);}const signal=options.signal;if(signal?.aborted)return Promise.resolve('cancelled' as const);return new Promise<ConfirmResult>(resolve=>{const doc=owner.scope.portalContainer?.ownerDocument??document;const active=activeElement(document)??activeElement(doc);const session=owner.queue[0];const popupOwner=active?[...mountedPopups].find(([,node])=>node.contains(active))?.[0]:undefined;const opener=popupOwner?popupOwner.opener:session&&!active?session.opener:active;const request:Request={id:++owner.sequence,options:{...options},settled:false,resolve,detach:()=>{},opener,document:doc,popup:null};owner.queue.push(request);if(signal){const aborted=()=>settle(request,'cancelled');signal.addEventListener('abort',aborted,{once:true});request.detach=()=>signal.removeEventListener('abort',aborted);}emit();});}
  function assignPopup(request:Request,node:HTMLDivElement|null){request.popup=node;if(node){mountedPopups.set(request,node);request.document=node.ownerDocument;}else mountedPopups.delete(request);}
  function finalFocus(request:Request){if(owner.queue.length)return false;if(reachable(request.opener))return request.opener;return [...(request.document?.querySelectorAll<HTMLElement>(FOCUSABLE)??[])].find(node=>reachable(node)&&node.tabIndex>=0&&!node.closest('.nova-confirm'))??false;}
  function dispose(){owner.alive=false;const requests=owner.queue;owner.queue=[];for(const request of requests){if(request.settled)continue;request.settled=true;request.detach();request.resolve('cancelled');}if(owner.committed)emit();}
 return {
  confirm,settle,assignPopup,finalFocus,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
  snapshot:()=>owner.queue[0]??null,
  setScope:(next:NovaScope)=>{owner.scope=next;},
  markCommitted:()=>{owner.committed=true;owner.alive=true;},
  markRemoved:()=>{owner.committed=false;owner.alive=false;},
  activate:()=>{owner.alive=owner.committed;},
  deactivate:()=>{dispose();if(owner.committed)owner.alive=true;},
 };
}
const serverSnapshot=()=>null;
export function ConfirmProvider({children}:ConfirmProviderProps){
 const scope=useNovaScope();const [methods]=useState(()=>createOwner(scope));
 const current=useSyncExternalStore(methods.subscribe,methods.snapshot,serverSnapshot);
 useLayoutEffect(()=>methods.setScope(scope),[methods,scope]);
 // This marker performs no store, DOM or promise work.
 useInsertionEffect(()=>{methods.markCommitted();return methods.markRemoved;},[methods]);
 useLayoutEffect(()=>{methods.activate();return methods.deactivate;},[methods]);
 return <Context.Provider value={methods.confirm}>{children}{current&&<ConfirmView key={current.id} request={current} methods={methods} scope={scope}/>}</Context.Provider>;
}
function ConfirmView({request,methods,scope}:{request:Request;methods:{settle:(request:Request,result:ConfirmResult)=>void;assignPopup:(request:Request,node:HTMLDivElement|null)=>void;finalFocus:(request:Request)=>HTMLElement|false};scope:NovaScope}){
 const id=useId(),cancel=useRef<HTMLButtonElement|null>(null),confirm=useRef<HTMLButtonElement|null>(null);const popupRef=useCallback((node:HTMLDivElement|null)=>methods.assignPopup(request,node),[methods,request]);const {options}=request;
 const cancelLabel=options.cancelLabel?.trim()?options.cancelLabel:scope.strings.feedback.cancel??en.feedback.cancel;
 const confirmLabel=options.confirmLabel?.trim()?options.confirmLabel:scope.strings.feedback.confirm??en.feedback.confirm;
 return <Primitive.Root open onOpenChange={next=>{if(!next)methods.settle(request,'cancelled');}}><PortalScope modal>{(container,portalRef)=><Primitive.Portal container={container} ref={portalRef}><Primitive.Backdrop forceRender className="nova-dialog__backdrop nova-confirm__backdrop" onClick={event=>{if(event.target===event.currentTarget)methods.settle(request,'cancelled');}}/><Primitive.Popup ref={popupRef} className="nova-dialog nova-confirm" data-tone={options.tone??'neutral'} initialFocus={()=>options.tone==='danger'?cancel.current:confirm.current} finalFocus={()=>methods.finalFocus(request)} aria-modal={true} aria-labelledby={id+'-title'} aria-describedby={options.description?id+'-description':undefined}><Primitive.Title className="nova-dialog__title" id={id+'-title'}>{options.title}</Primitive.Title>{options.description&&<Primitive.Description className="nova-dialog__description" id={id+'-description'}>{options.description}</Primitive.Description>}<div className="nova-confirm__actions"><button type="button" ref={cancel} className="nova-confirm__button" onClick={()=>methods.settle(request,'cancelled')}>{cancelLabel}</button><button type="button" ref={confirm} className="nova-confirm__button" data-variant={options.tone==='danger'?'danger':'primary'} onClick={()=>methods.settle(request,'confirmed')}>{confirmLabel}</button></div></Primitive.Popup></Primitive.Portal>}</PortalScope></Primitive.Root>;
}
