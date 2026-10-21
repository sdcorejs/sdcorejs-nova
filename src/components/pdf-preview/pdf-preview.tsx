'use client';
import {useId,useLayoutEffect,useMemo,useRef,useState,type HTMLAttributes,type Ref} from 'react';
import type {SurfaceProps,LoadContext} from '../../types/index.js';
import {useNovaScope} from '../../providers/nova/context.js';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {Button} from '../button/button.js';
import {documentDisposer,hasAccessibleContent,pdfFailure,pdfStrings,type PdfFailure} from './pdf-lifecycle.js';
export type PdfAdapter={open:(source:Blob|string,ctx:LoadContext)=>Promise<{pageCount:number;renderPage:(page:number,target:{canvas:HTMLCanvasElement;textLayer:HTMLElement},ctx:LoadContext)=>Promise<void>;accessibleTextLayer:true;dispose:()=>void}>};
/** Native section props are forwarded; ref targets the stable document section. title names the document, never a native tooltip. */
export type PdfPreviewProps=SurfaceProps&Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'defaultValue'|'defaultChecked'|'title'|'aria-label'|'aria-labelledby'|'aria-busy'|'role'>&{ref?:Ref<HTMLElement>;source:Blob|string;adapter:PdfAdapter;title:string;onDownload?:()=>void;onPrint?:()=>void;children?:never;dangerouslySetInnerHTML?:never;'aria-label'?:never;'aria-labelledby'?:never;'aria-busy'?:never;role?:never};
type Document=Awaited<ReturnType<PdfAdapter['open']>>;
type Session={source:Blob|string;open:PdfAdapter['open'];document?:Document;failure?:PdfFailure};
export function PdfPreview({source,adapter,title,onDownload,onPrint,ref,onClick,className,style,'data-testid':testId,...rest}:PdfPreviewProps){
 const open=adapter.open,strings=pdfStrings(useNovaScope()),titleId=useId(),[retry,setRetry]=useState(0),[session,setSession]=useState<Session>(),[page,setPage]=useState(1),[dispose]=useState(documentDisposer);
 const current=session?.source===source&&session.open===open?session:undefined;
 // eslint-disable-next-line react-hooks/set-state-in-effect -- A changed source/open callback owns a new abortable document lifecycle; the first render stays deterministic for SSR.
 useLayoutEffect(()=>{const controller=new AbortController();let owned:Document|undefined;setSession({source,open});setPage(1);
  void (async()=>{try{const document=await open(source,{signal:controller.signal});if(controller.signal.aborted){dispose(document);return;}owned=document;
   const failure:PdfFailure|undefined=!Number.isSafeInteger(document.pageCount)||document.pageCount<1?'invalid':document.accessibleTextLayer!==true?'inaccessible':undefined;
   if(failure){dispose(document);setSession({source,open,failure});return;}setSession({source,open,document});
  }catch(error){if(!controller.signal.aborted)setSession({source,open,failure:pdfFailure(error)});}})();
  return()=>{controller.abort();if(owned)dispose(owned);};
 },[source,open,retry,dispose]);
 const document=current?.document,failure=current?.failure;
 const rootRef=useMemo(()=>forwardedSectionRef(ref),[ref]);
 const native:Record<string,unknown>={...rest};for(const key of ['children','dangerouslySetInnerHTML','defaultValue','defaultChecked','aria-label','aria-labelledby','aria-busy','role'])delete native[key];
 // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Root delegates existing native button clicks after consumer cancellation; each button retains native keyboard activation.
 return <section {...native} ref={rootRef} aria-labelledby={titleId} onClick={event=>{onClick?.(event);if(event.defaultPrevented)return;const action=(event.target as Element).closest<HTMLButtonElement>('button[data-nova-pdf-action]');if(!action||action.parentElement?.parentElement!==event.currentTarget||action.disabled)return;switch(action.dataset.novaPdfAction){case 'previous':if(document)setPage(value=>Math.max(1,value-1));break;case 'next':if(document)setPage(value=>Math.min(document.pageCount,value+1));break;case 'retry':setRetry(value=>value+1);break;case 'download':onDownload?.();break;case 'print':onPrint?.();break;}}} className={cx('nova-pdf-preview',className)} style={style} data-testid={testId} aria-busy={!document&&!failure}>
  <h2 id={titleId} className="nova-pdf-preview__title">{title}</h2>
  {!document&&!failure&&<div role="status">{strings.loading}</div>}
  {failure&&<div role="alert">{strings[failure]}</div>}
  {document&&<><div role="group" aria-label={strings.navigation} className="nova-pdf-preview__actions"><Button variant="secondary" size="sm" disabled={page===1} data-nova-pdf-action="previous"><Icon name="chevron-left"/>{strings.previous}</Button><output aria-label={strings.page} aria-live="polite">{page} / {document.pageCount}</output><Button variant="secondary" size="sm" disabled={page===document.pageCount} data-nova-pdf-action="next">{strings.next}<Icon name="chevron-right"/></Button></div><PdfPage key={page} document={document} page={page} label={strings.page+' '+page} loading={strings.loading} onFailure={reason=>{dispose(document);setSession({source,open,failure:reason});}}/></>}
  <div className="nova-pdf-preview__actions">{failure&&<Button variant="secondary" size="sm" data-nova-pdf-action="retry">{strings.retry}</Button>}{onDownload&&<Button size="sm" data-nova-pdf-action="download">{strings.download}</Button>}{onPrint&&<Button variant="secondary" size="sm" data-nova-pdf-action="print">{strings.print}</Button>}</div>
 </section>;
}
function PdfPage({document,page,label,loading,onFailure}:{document:Document;page:number;label:string;loading:string;onFailure:(reason:PdfFailure)=>void}){
 const host=useRef<HTMLDivElement>(null),[busy,setBusy]=useState(true);
 useLayoutEffect(()=>{const container=host.current;if(!container)return;const controller=new AbortController(),canvas=container.ownerDocument.createElement('canvas'),textLayer=container.ownerDocument.createElement('div');canvas.setAttribute('aria-hidden','true');textLayer.className='nova-pdf-preview__text-layer';container.append(canvas,textLayer);setBusy(true);
  void (async()=>{try{await document.renderPage(page,{canvas,textLayer},{signal:controller.signal});if(controller.signal.aborted)return;if(!hasAccessibleContent(textLayer)){onFailure('inaccessible');return;}setBusy(false);}catch(error){if(!controller.signal.aborted)onFailure(pdfFailure(error));}})();
  return()=>{controller.abort();canvas.remove();textLayer.remove();};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- The callback belongs to this document/page generation; callback wrappers and translated labels must not restart adapter work.
 },[document,page]);
 return <><div className="nova-pdf-preview__page" role="region" aria-label={label} aria-busy={busy} ref={host}/>{busy&&<div role="status">{loading}</div>}</>;
}

/** Stable forwarding preserves React19 returned cleanups and legacy callback null semantics. */
function forwardedSectionRef(ref:Ref<HTMLElement>|undefined){return (node:HTMLElement|null)=>{if(node===null)return;if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>{ref(null);};}if(ref){ref.current=node;return()=>{ref.current=null;};}};}
