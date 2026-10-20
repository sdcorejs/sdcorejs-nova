'use client';
import {useInsertionEffect,useLayoutEffect,useRef,useState,type MutableRefObject} from 'react';
import {Dialog,type DialogBaseProps} from '../dialog/dialog.js';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';

export type DialogSize={width:number;height:number};
export type ResizableDialogProps=DialogBaseProps&{
 /** Controlled when supplied. Resize callbacks are proposals, just like Dialog's boolean value. */
 size?:DialogSize;onSizeChange?:(size:DialogSize)=>void;
 /** Disables resizing only; Dialog still owns close, focus and open state. */
 disabled?:boolean;
};
type Viewport={width:number;height:number};
type Owner={active:boolean;size:DialogSize;viewport:Viewport|null;disabled:boolean;propose:(size:DialogSize)=>void};
const fallback:DialogSize={width:512,height:360},messages={en:{dialogResize:'Resize dialog'},vi:{dialogResize:'Điều chỉnh kích thước hộp thoại'}};
declare const process:{env:{NODE_ENV?:string}};
function clamp(size:DialogSize,viewport:Viewport|null):DialogSize{
 const narrow=viewport!==null&&viewport.width<=640,margin=narrow?0:32;
 const maxWidth=viewport?Math.max(1,viewport.width-margin):16384,maxHeight=viewport?Math.max(1,viewport.height-margin):16384;
 return {width:narrow?maxWidth:Math.max(Math.min(240,maxWidth),Math.min(maxWidth,typeof size?.width==='number'&&Number.isFinite(size.width)&&size.width>0?size.width:fallback.width)),height:narrow?maxHeight:Math.max(Math.min(160,maxHeight),Math.min(maxHeight,typeof size?.height==='number'&&Number.isFinite(size.height)&&size.height>0?size.height:fallback.height))};
}
function ResizeHandle({owner,onViewport,label,disabled}:{owner:MutableRefObject<Owner>;onViewport:(viewport:Viewport)=>void;label:string;disabled:boolean}){
 const handle=useRef<HTMLButtonElement>(null),stop=useRef<(()=>void)|null>(null);
 useLayoutEffect(()=>{
  const element=handle.current,view=element?.ownerDocument.defaultView;if(!view)return;
  const update=()=>{const width=view.innerWidth,height=view.innerHeight;if(Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0)onViewport({width,height});};
  update();view.addEventListener('resize',update);return()=>{stop.current?.();view.removeEventListener('resize',update);};
 },[onViewport]);
 useLayoutEffect(()=>{if(disabled)stop.current?.();},[disabled]);
 function propose(next:DialogSize){const state=owner.current;if(!state.active||state.disabled)return;const size=clamp(next,state.viewport);if(size.width!==state.size.width||size.height!==state.size.height)state.propose(size);}
 return <button ref={handle} type="button" className="nova-resizable-dialog__handle" aria-label={label} disabled={disabled}
  onKeyDown={event=>{const amount=event.shiftKey?50:10,state=owner.current,size=state.size,rtl=event.currentTarget.ownerDocument.defaultView?.getComputedStyle(event.currentTarget).direction==='rtl';
   let next:DialogSize|undefined;
   if(event.key==='ArrowRight'||event.key==='ArrowLeft')next={...size,width:size.width+(event.key==='ArrowRight'?amount:-amount)*(rtl?-1:1)};
   if(event.key==='ArrowDown'||event.key==='ArrowUp')next={...size,height:size.height+(event.key==='ArrowDown'?amount:-amount)};
   if(event.key==='Home')next={width:240,height:160};if(event.key==='End')next={width:16384,height:16384};
   if(next){event.preventDefault();propose(next);}}}
  onPointerDown={event=>{
   const state=owner.current;if(event.button!==0||!state.active||state.disabled)return;event.preventDefault();event.currentTarget.focus();stop.current?.();
   const target=event.currentTarget,doc=target.ownerDocument,view=doc.defaultView,pointer=event.pointerId,start={x:event.clientX,y:event.clientY},base={...state.size},direction=view?.getComputedStyle(target).direction==='rtl'?-1:1;
   const move=(next:PointerEvent)=>{if(next.pointerId===pointer)propose({width:base.width+(next.clientX-start.x)*direction,height:base.height+next.clientY-start.y});};
   const end=(next:PointerEvent)=>{if(next.pointerId===pointer)finish();};
   const finish=()=>{doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',end);doc.removeEventListener('pointercancel',end);target.removeEventListener('lostpointercapture',end);view?.removeEventListener('blur',finish);stop.current=null;try{if(target.hasPointerCapture?.(pointer))target.releasePointerCapture(pointer);}catch{/* detached/cancelled capture */}};
   stop.current=finish;doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',end);target.addEventListener('lostpointercapture',end);view?.addEventListener('blur',finish);try{target.setPointerCapture?.(pointer);}catch{finish();}
  }}><span className="nova-resizable-dialog__icon" aria-hidden="true"><Icon name="grip"/></span></button>;
}

/** Composes Dialog without replacing its boolean state, portal or focus lifecycle. */
export function ResizableDialog({size,onSizeChange,disabled=false,className,style,children,...dialog}:ResizableDialogProps){
 const scope=useNovaScope(),report=useDiagnostics('ResizableDialog');
 const [current,setSize]=useControllableValue<DialogSize>({value:size,onValueChange:onSizeChange,fallback,disabled,report});
 const [viewport,setViewport]=useState<Viewport|null>(null),geometry=clamp(current,viewport),narrow=viewport!==null&&viewport.width<=640;
 const owner=useRef<Owner>({active:false,size:geometry,viewport,disabled:true,propose:setSize});
 // Commit ownership before a portal descendant submits viewport measurements in layout.
 useInsertionEffect(()=>{owner.current={active:true,size:geometry,viewport,disabled:disabled||narrow,propose:setSize};return()=>{owner.current.active=false;};});
 const invalid=typeof current?.width!=='number'||!Number.isFinite(current.width)||current.width<=0||typeof current?.height!=='number'||!Number.isFinite(current.height)||current.height<=0;
 useLayoutEffect(()=>{
  if(!invalid)return;try{if(process.env.NODE_ENV==='production')return;}catch{/* browser dev fallback */}
  const key='NOVA_RESIZABLE_DIALOG_INVALID_SIZE|ResizableDialog';if(scope.diagnostics.seen.has(key))return;scope.diagnostics.seen.add(key);
  console.warn('[nova] NOVA_RESIZABLE_DIALOG_INVALID_SIZE <ResizableDialog>: dimensions must be finite positive numbers; using safe bounded geometry');
 },[invalid,scope.diagnostics]);
 const strings:typeof scope.strings.common&Partial<typeof messages.en>=scope.strings.common,label=strings.dialogResize??(scope.locale.toLowerCase().startsWith('vi')?messages.vi.dialogResize:messages.en.dialogResize);
 return <Dialog {...dialog} className={cx('nova-resizable-dialog',className)} style={{...style,width:geometry.width,height:geometry.height}}>{children}<ResizeHandle owner={owner} onViewport={setViewport} label={label} disabled={disabled||narrow}/></Dialog>;
}
