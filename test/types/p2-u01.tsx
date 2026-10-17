// case-p2-u01-ac01-types: parent verifies packed root/subpath resolution.
import {FileUpload,type FileUploadProps} from '@sdcorejs/nova/file-upload';
import {useFileTransfer,type TransferAdapter,type TransferState} from '@sdcorejs/nova/file-transfer';
import {FileUpload as RootUpload,useFileTransfer as rootTransfer} from '@sdcorejs/nova';
const adapter:TransferAdapter={upload:async(file,ctx)=>{const raw:File=file,signal:AbortSignal=ctx.signal;ctx.onProgress(0);ctx.onProgress(0,0);void [raw,signal];return {id:'consumer'};},download:async(request,ctx)=>{const id:string=request.id;void [id,ctx.signal];return undefined;}};
const props:FileUploadProps={onFiles:files=>{const raw:readonly File[]=files;void raw;},maxFiles:0,maxFileBytes:0,accept:'image/*',multiple:true};
function Consumer(){const transfer=useFileTransfer({adapter,concurrency:2});const items:readonly TransferState[]=transfer.items;const blob:Promise<Blob|void>=transfer.download({id:'consumer',name:'file'});transfer.cancel('attempt');transfer.retry('attempt');rootTransfer({adapter});
 // @ts-expect-error upload must receive raw File, never serialized text
 transfer.enqueue(['file']);
 // @ts-expect-error download source identity remains a consumer string
 transfer.download({id:0,name:'file'});
 // @ts-expect-error transfer item snapshots are readonly
 transfer.items.push({id:'x',direction:'upload',name:'x',status:'success'});
 void [items,blob];return <><FileUpload {...props}/><RootUpload {...props}/></>;
}
// @ts-expect-error onFiles is required; native selection is consumer-owned
const missing=<FileUpload/>;
// @ts-expect-error file sizes are byte counts, not unit strings
const badSize=<FileUpload {...props} maxFileBytes="4MB"/>;
// @ts-expect-error download adapter returns Blob or void, not a claimed saved filename
const badDownload:TransferAdapter={upload:adapter.upload,download:async()=>({saved:'file'})};
// @ts-expect-error upload result contains consumer id string
const badUpload:TransferAdapter={upload:async()=>({id:0})};
void [Consumer,missing,badSize,badDownload,badUpload];

import {createRef,type Ref} from 'react';
const focusObject=createRef<HTMLElement>(),uploadRoot=createRef<HTMLDivElement>();
const focusCleanup:Ref<HTMLElement>=node=>{if(node)node.focus();return ()=>{};};
const focusLegacy:Ref<HTMLElement>=node=>{node?.focus();};
const inheritedFocusProps:FileUploadProps={...props,focusRef:focusObject,ref:uploadRoot};
const inheritedFocusConsumers=<><FileUpload {...inheritedFocusProps}/><RootUpload {...props} focusRef={focusCleanup}/><FileUpload {...props} focusRef={focusLegacy}/></>;
// @ts-expect-error focus target must be an HTMLElement, not SVG
const invalidFocus=<FileUpload {...props} focusRef={createRef<SVGSVGElement>()}/>;
// @ts-expect-error existing root ref remains HTMLDivElement, separate from the interactive target
const invalidUploadRoot=<FileUpload {...props} ref={createRef<HTMLButtonElement>()}/>;
void [inheritedFocusConsumers,invalidFocus,invalidUploadRoot];

// U01 preview/clear public API; current unpacked declarations are checked separately from packed consumption.
function PreviewConsumer(){const transfer=useFileTransfer({adapter});const preview:Promise<string|undefined>=transfer.preview('attempt');const clear:void=transfer.clear();
 // @ts-expect-error only queue attempt IDs identify upload previews
 transfer.preview(0);
 // @ts-expect-error clear never accepts caller-owned URLs
 transfer.clear('blob:caller');
 void [preview,clear];return null;}
void PreviewConsumer;
