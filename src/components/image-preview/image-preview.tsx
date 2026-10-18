'use client';
import {useLayoutEffect,useMemo,useRef,useState,type HTMLAttributes,type Ref} from 'react';
import type {SurfaceProps} from '../../types/index.js';
import {useNovaScope} from '../../providers/nova/context.js';
import {cx} from '../../lib/cx.js';
import {Button} from '../button/button.js';
/** Native section props are forwarded; ref targets the stable, focusable preview section. */
export type ImagePreviewProps=SurfaceProps&Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'defaultValue'|'defaultChecked'|'onError'|'aria-label'|'aria-labelledby'|'aria-busy'|'role'|'tabIndex'>&{ref?:Ref<HTMLElement>;src:string;alt:string;onError?:()=>void;onDownload?:()=>void;children?:never;dangerouslySetInnerHTML?:never;'aria-label'?:never;'aria-labelledby'?:never;'aria-busy'?:never;role?:never;tabIndex?:never;'data-zoom'?:never};
export function ImagePreview(props:ImagePreviewProps){return <ImageContent {...props}/>;}
function ImageContent({src,alt,onError,onDownload,ref,onKeyDown,onClick,className,style,'data-testid':testId,...rest}:ImagePreviewProps){
 const [failed,setFailed]=useState(false),[zoom,setZoom]=useState(100),notified=useRef(false),scope=useNovaScope();
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Source changes reset image-local presentation while retaining the same documented root and forwarded ref.
 useLayoutEffect(()=>{setFailed(false);setZoom(100);notified.current=false;},[src]);
 const rootRef=useMemo(()=>forwardedSectionRef(ref),[ref]);
 const native:Record<string,unknown>={...rest};for(const key of ['children','dangerouslySetInnerHTML','defaultValue','defaultChecked','aria-label','aria-labelledby','aria-busy','role','tabIndex','data-zoom'])delete native[key];
 const fallback=scope.locale.startsWith('en')?{error:'Unable to load this image.',download:'Download',zoomIn:'Zoom in',zoomOut:'Zoom out',reset:'Reset zoom'}:{error:'Không thể tải ảnh này.',download:'Tải xuống',zoomIn:'Phóng to',zoomOut:'Thu nhỏ',reset:'Đặt lại thu phóng'};
 const projection=scope.strings.feedback as unknown as Record<string,unknown>,strings=Object.fromEntries(Object.entries(fallback).map(([key,value])=>[key,typeof projection['imagePreview'+key[0]!.toUpperCase()+key.slice(1)]==='string'?projection['imagePreview'+key[0]!.toUpperCase()+key.slice(1)]:value])) as typeof fallback;
 const change=(delta:number)=>setZoom(value=>Math.max(25,Math.min(400,value+delta)));
 // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Named focusable preview region provides documented zoom shortcuts alongside native buttons.
 return <section {...native} ref={rootRef} aria-label={alt} tabIndex={0} className={cx('nova-image-preview',className)} style={style} data-testid={testId} data-zoom={zoom} onClick={event=>{onClick?.(event);if(event.defaultPrevented)return;const action=(event.target as Element).closest<HTMLButtonElement>('button[data-nova-image-action]');if(!action||action.parentElement?.parentElement!==event.currentTarget||action.disabled)return;switch(action.dataset.novaImageAction){case 'out':change(-25);break;case 'in':change(25);break;case 'reset':setZoom(100);break;case 'download':onDownload?.();break;}}} onKeyDown={event=>{onKeyDown?.(event);if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.target!==event.currentTarget)return;if(event.key==='+'||event.key==='='){event.preventDefault();change(25);}else if(event.key==='-'){event.preventDefault();change(-25);}else if(event.key==='0'){event.preventDefault();setZoom(100);}}}>
  {failed?<div role="alert">{strings.error}</div>:<div className="nova-image-preview__viewport"><img className="nova-image-preview__image" src={src} alt={alt} onError={()=>{setFailed(true);if(!notified.current){notified.current=true;onError?.();}}}/></div>}
  <div className="nova-image-preview__actions"><Button variant="secondary" disabled={failed||zoom===25} data-nova-image-action="out">{strings.zoomOut}</Button><output aria-live="polite">{zoom}%</output><Button variant="secondary" disabled={failed||zoom===400} data-nova-image-action="in">{strings.zoomIn}</Button><Button variant="secondary" disabled={failed} data-nova-image-action="reset">{strings.reset}</Button>{onDownload&&<Button data-nova-image-action="download">{strings.download}</Button>}</div>
 </section>;
}

/** Stable forwarding preserves React19 returned cleanups and legacy callback null semantics. */
function forwardedSectionRef(ref:Ref<HTMLElement>|undefined){return (node:HTMLElement|null)=>{if(node===null)return;if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>{ref(null);};}if(ref){ref.current=node;return()=>{ref.current=null;};}};}
