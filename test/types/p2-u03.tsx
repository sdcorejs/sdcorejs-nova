// case-p2-u03-ac01-types public root/subpath fixture; packed resolution parent-owned.
import {ImagePreview,type ImagePreviewProps} from '@sdcorejs/nova/image-preview';
import {PdfPreview,type PdfPreviewProps,type PdfAdapter} from '@sdcorejs/nova/pdf-preview';
import {ImagePreview as RootImage,PdfPreview as RootPdf} from '@sdcorejs/nova';
const adapter:PdfAdapter={open:async(source,ctx)=>{const raw:Blob|string=source,signal:AbortSignal=ctx.signal;void [raw,signal];return {pageCount:1,accessibleTextLayer:true,renderPage:async(page,target,context)=>{const n:number=page,c:HTMLCanvasElement=target.canvas,t:HTMLElement=target.textLayer,s:AbortSignal=context.signal;void [n,c,t,s];},dispose:()=>{}};}};
const image:ImagePreviewProps={src:'caller',alt:'Image',onDownload:()=>{},onError:()=>{},className:'consumer',style:{color:'red'}};
const pdf:PdfPreviewProps={source:new Blob(),adapter,title:'Invoice',onPrint:()=>{},onDownload:()=>{}};
const valid=<><ImagePreview {...image}/><RootImage {...image}/><PdfPreview {...pdf}/><RootPdf {...pdf}/></>;
// @ts-expect-error image accessible alternative is required
const noAlt=<ImagePreview src="x"/>;
// @ts-expect-error PDF document title is required
const noTitle=<PdfPreview source="x" adapter={adapter}/>;
// @ts-expect-error no disabled API
const disabled=<PdfPreview {...pdf} disabled/>;
// @ts-expect-error no generic business value API
const value=<ImagePreview {...image} value="x"/>;
// @ts-expect-error typed PDF source is explicit Blob|string
const invalidSource=<PdfPreview {...pdf} source={42}/>;
// @ts-expect-error accessibleTextLayer true is mandatory
const missingCapability:PdfAdapter={open:async()=>({pageCount:1,renderPage:async()=>{},dispose:()=>{}})};
// @ts-expect-error canvas-only capability is disallowed
const canvasOnly:PdfAdapter={open:async()=>({pageCount:1,accessibleTextLayer:false,renderPage:async()=>{},dispose:()=>{}})};
// @ts-expect-error no silent built-in print boolean
const print=<PdfPreview {...pdf} print/>;
void [valid,noAlt,noTitle,disabled,value,invalidSource,missingCapability,canvasOnly,print];

// repair-r1 positive root section/ref composition contract; source-only projection is supplementary.
import {createRef,type RefCallback} from 'react';
const sectionRef=createRef<HTMLElement>();
const cleanupCallback:RefCallback<HTMLElement>=node=>{if(node)return ()=>{};};
const nativeImage:ImagePreviewProps={...image,ref:sectionRef,id:'image',lang:'en',dir:'rtl','aria-describedby':'help',onFocus:event=>event.currentTarget.focus(),onBlur:event=>{const node:HTMLElement=event.currentTarget;void node;},onKeyDown:event=>event.preventDefault(),onClick:event=>event.preventDefault()};
const nativePdf:PdfPreviewProps={...pdf,ref:cleanupCallback,id:'pdf',tabIndex:0,'aria-describedby':'help',onFocus:event=>event.currentTarget.focus(),onClick:event=>event.preventDefault()};
const nativeValid=<><ImagePreview {...nativeImage}/><PdfPreview {...nativePdf}/></>;
void nativeValid;

// repair-r1 supplementary negative fixtures protect owned section semantics.
// @ts-expect-error generated image accessible name is owned by alt
const overrideImageName=<ImagePreview {...image} aria-label="Wrong"/>;
// @ts-expect-error document busy state is component owned
const overridePdfBusy=<PdfPreview {...pdf} aria-busy/>;
// @ts-expect-error document accessible name is generated from title
const overridePdfName=<PdfPreview {...pdf} aria-labelledby="wrong"/>;
// @ts-expect-error raw HTML is not an adapter/preview API
const rawImage:ImagePreviewProps={...image,dangerouslySetInnerHTML:{__html:'raw'}};
// @ts-expect-error arbitrary children are not a PDF surface slot
const rawPdf=<PdfPreview {...pdf}>raw</PdfPreview>;
// @ts-expect-error ImagePreview's keyboard focus target is component owned
const imageTab=<ImagePreview {...image} tabIndex={-1}/>;
// @ts-expect-error generated zoom remains local state
const imageZoom=<ImagePreview {...image} data-zoom="200"/>;
void [overrideImageName,overridePdfBusy,overridePdfName,rawImage,rawPdf,imageTab,imageZoom];
