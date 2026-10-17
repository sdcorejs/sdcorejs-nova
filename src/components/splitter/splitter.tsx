'use client';
import {Children,Fragment,useCallback,useId,useInsertionEffect,useLayoutEffect,useRef,type ReactNode,type Ref} from 'react';
import {cx} from '../../lib/cx.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import type {SurfaceProps,ValueProps} from '../../types/index.js';

export type SplitterProps=ValueProps<readonly number[]>&SurfaceProps&{
 /** Ref to the existing div that contains the panels and separators. */
 ref?:Ref<HTMLDivElement>;
 /** Horizontal arranges panels in a row; its separator is vertical. */
 orientation?:'horizontal'|'vertical';minSizes?:readonly number[];disabled?:boolean;readOnly?:boolean;children:ReactNode;
};
const messages={en:{splitterResize:'Resize panels'},vi:{splitterResize:'Điều chỉnh kích thước khung'}};
declare const process:{env:{NODE_ENV?:string}};
// Array iteration skips holes. Validate each own index and copy only dense data.
function densePercentages(input:unknown,count:number):number[]|null{
 if(!Array.isArray(input)||input.length!==count)return null;
 const result:number[]=[];
 for(let index=0;index<count;index++){
  const value:unknown=input[index];
  if(!Object.hasOwn(input,index)||typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)return null;
  result.push(value);
 }
 return result;
}
function normalize(value:readonly number[],minimums:readonly number[]|undefined,count:number){
 if(!count)return {sizes:[],mins:[],invalid:!Array.isArray(value)||value.length>0};
 const denseMins=minimums===undefined?Array<number>(count).fill(0):densePercentages(minimums,count),denseValue=densePercentages(value,count);
 const validMin=denseMins!==null&&denseMins.reduce((a,b)=>a+b,0)<=100;
 const mins=validMin&&denseMins?denseMins:Array<number>(count).fill(0),valid=denseValue!==null;
 const sum=denseValue?denseValue.reduce((a,b)=>a+b,0):0;
 const desired=denseValue&&sum>0?denseValue.map(x=>x/sum*100):Array<number>(count).fill(100/count);
 const extras=desired.map((x,i)=>Math.max(0,x-mins[i]!)),extraSum=extras.reduce((a,b)=>a+b,0),remaining=100-mins.reduce((a,b)=>a+b,0);
 const sizes=mins.map((x,i)=>x+remaining*(extraSum?extras[i]!/extraSum:1/count));
 // Absorb floating point residue on a panel with slack, never below its min.
 const slack=sizes.findIndex((x,i)=>x>mins[i]!);const last=slack<0?count-1:slack;sizes[last]=sizes[last]!+(100-sizes.reduce((a,b)=>a+b,0));
 return {sizes,mins,invalid:!validMin||!valid||Math.abs(sum-100)>1e-7||desired.some((x,i)=>x<mins[i]!)};
}

/** Accepted value owns all geometry; pointer/keyboard events only propose values. */
export function Splitter({value,defaultValue,onValueChange,orientation='horizontal',minSizes,disabled=false,readOnly=false,children,className,style,ref,'data-testid':testId}:SplitterProps){
 const scope=useNovaScope(),report=useDiagnostics('Splitter'),parts=Children.toArray(children),id=useId();
 const [current,setValue]=useControllableValue<readonly number[]>({value,defaultValue,onValueChange,fallback:parts.map(()=>100/parts.length),disabled,readOnly,report});
 const {sizes,mins,invalid}=normalize(current,minSizes,parts.length),root=useRef<HTMLDivElement>(null),stop=useRef<(()=>void)|null>(null);
 const rootRef=useCallback((node:HTMLDivElement|null)=>{
  root.current=node;
  const cleanup=typeof ref==='function'?ref(node):undefined;
  if(ref&&typeof ref!=='function')ref.current=node;
  return()=>{
   root.current=null;
   if(typeof cleanup==='function')cleanup();
   else if(typeof ref==='function')ref(null);
   else if(ref)ref.current=null;
  };
 },[ref]);
 const strings:typeof scope.strings.common&Partial<typeof messages.en>=scope.strings.common;
 const label=strings.splitterResize??(scope.locale.toLowerCase().startsWith('vi')?messages.vi.splitterResize:messages.en.splitterResize);
 const owner=useRef({active:false,sizes,mins,setValue,disabled,readOnly,orientation});
 useInsertionEffect(()=>{owner.current={active:true,sizes,mins,setValue,disabled,readOnly,orientation};return()=>{owner.current.active=false;};});
 const configuration=JSON.stringify([orientation,mins,parts.length,disabled,readOnly]);
 useLayoutEffect(()=>{stop.current?.();return()=>stop.current?.();},[configuration]);
 useLayoutEffect(()=>{
  if(!invalid)return;
  try{if(process.env.NODE_ENV==='production')return;}catch{/* browser dev fallback */}
  const key='NOVA_SPLITTER_INVALID_CONFIGURATION|Splitter';if(scope.diagnostics.seen.has(key))return;scope.diagnostics.seen.add(key);
  console.warn('[nova] NOVA_SPLITTER_INVALID_CONFIGURATION <Splitter>: percentages and minimums must be finite, match panels, and form a feasible total of 100; using safe normalized sizes');
 },[invalid,scope.diagnostics]);
 function propose(index:number,next:number,base=owner.current.sizes){
  const state=owner.current;if(!state.active||state.disabled||state.readOnly)return;
  const total=base[index]!+base[index+1]!,bounded=Math.max(state.mins[index]!,Math.min(total-state.mins[index+1]!,next));
  if(!Number.isFinite(bounded)||Math.abs(bounded-state.sizes[index]!)<1e-9)return;
  const result=[...base];result[index]=bounded;result[index+1]=total-bounded;state.setValue(result);
 }
 function rtl(){return scope.dir==='rtl'||(scope.dir===undefined&&root.current?.ownerDocument.defaultView?.getComputedStyle(root.current).direction==='rtl');}
 return <div ref={rootRef} className={cx('nova-splitter',className)} style={style} data-testid={testId} data-orientation={orientation} data-disabled={disabled||undefined}>
  {parts.map((child,index)=><Fragment key={index}><div id={id+'-panel-'+index} className="nova-splitter__panel" style={{flexBasis:sizes[index]+'%'}}>{child}</div>{index<parts.length-1&&
   // A focusable WAI-ARIA window splitter exposes separator range semantics.
   // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role
   <button type="button" disabled={disabled} className="nova-splitter__separator" role="separator" tabIndex={disabled?-1:0} aria-label={label} aria-controls={id+'-panel-'+index}
   aria-orientation={orientation==='horizontal'?'vertical':'horizontal'} aria-valuemin={mins[index]} aria-valuemax={sizes[index]!+sizes[index+1]!-mins[index+1]!} aria-valuenow={sizes[index]}
   aria-disabled={disabled||readOnly||undefined} data-readonly={readOnly||undefined}
   onKeyDown={event=>{const step=event.shiftKey?10:1,amount=orientation==='vertical'?(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0):(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)*(rtl()?-1:1);
    if(amount||event.key==='Home'||event.key==='End'){event.preventDefault();propose(index,event.key==='Home'?mins[index]!:event.key==='End'?sizes[index]!+sizes[index+1]!-mins[index+1]!:sizes[index]!+amount);}}}
   onPointerDown={event=>{
    if(event.button!==0||disabled||readOnly)return;const target=event.currentTarget,element=root.current;if(!element)return;
    const axis=orientation==='horizontal'?'clientX':'clientY',view=element.ownerDocument.defaultView;
    // Native layout resolves percentage/calc gaps. Measure only the allocation
    // actually occupied by our direct panels, independent of gap expressions.
    let available=[...element.querySelectorAll<HTMLElement>(':scope > .nova-splitter__panel')].reduce((sum,node)=>{const rect=node.getBoundingClientRect();return sum+(orientation==='horizontal'?rect.width:rect.height);},0);
    if(available===0){
     // Before panel layout is available, a fallback is valid only when CSSOM
     // provides a resolved pixel gap (or normal); never interpret %/calc as px.
     const bounds=element.getBoundingClientRect(),extent=orientation==='horizontal'?bounds.width:bounds.height,computed=view?.getComputedStyle(element),gapText=(orientation==='horizontal'?computed?.columnGap:computed?.rowGap)??'';
     const gap=gapText===''||gapText==='normal'?0:gapText.endsWith('px')?Number.parseFloat(gapText):Number.NaN;
     const separators=[...element.querySelectorAll<HTMLElement>(':scope > .nova-splitter__separator')].reduce((sum,node)=>{const rect=node.getBoundingClientRect();return sum+(orientation==='horizontal'?rect.width:rect.height);},0);
     const edges=orientation==='horizontal'?[computed?.paddingLeft,computed?.paddingRight,computed?.borderLeftWidth,computed?.borderRightWidth]:[computed?.paddingTop,computed?.paddingBottom,computed?.borderTopWidth,computed?.borderBottomWidth];
     const decoration=edges.reduce((sum,edge)=>{const pixels=Number.parseFloat(edge??'0');return sum+(Number.isFinite(pixels)?pixels:0);},0);
     available=extent-decoration-separators-gap*(parts.length*2-2);
    }
    if(!Number.isFinite(available)||available<=0)return;
    event.preventDefault();target.focus();stop.current?.();const pointer=event.pointerId,start=event[axis],base=[...owner.current.sizes],direction=orientation==='horizontal'&&rtl()?-1:1,doc=target.ownerDocument;
    const move=(next:PointerEvent)=>{if(next.pointerId===pointer)propose(index,base[index]!+(next[axis]-start)/available*100*direction,base);};
    const end=(next:PointerEvent)=>{if(next.pointerId===pointer)finish();};
    const finish=()=>{doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',end);doc.removeEventListener('pointercancel',end);target.removeEventListener('lostpointercapture',end);view?.removeEventListener('blur',finish);stop.current=null;try{if(target.hasPointerCapture?.(pointer))target.releasePointerCapture(pointer);}catch{/* detached/cancelled capture */}};
    stop.current=finish;doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',end);target.addEventListener('lostpointercapture',end);view?.addEventListener('blur',finish);
    try{target.setPointerCapture?.(pointer);}catch{finish();}
   }}/>}</Fragment>)}
 </div>;
}
