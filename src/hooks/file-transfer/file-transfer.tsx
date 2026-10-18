'use client';
import {useInsertionEffect,useLayoutEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {useNovaScope} from '../../providers/nova/context.js';
import {TransferQueue,type TransferMessages} from './transfer-queue.js';
export type TransferState={id:string;direction:'upload'|'download';name:string;file?:File;status:'queued'|'running'|'success'|'error'|'cancelled';progress?:number;errorMessage?:string;outcome?:'blob'|'browser-handoff';statusMessage?:string};
export type TransferAdapter={upload:(file:File,ctx:{signal:AbortSignal;onProgress:(loaded:number,total?:number)=>void})=>Promise<{id:string}>;download?:(request:{id:string;name:string},ctx:{signal:AbortSignal;onProgress:(loaded:number,total?:number)=>void})=>Promise<Blob|void>};
/** Blob results belong to the caller. Request upload previews in committed effects/user actions; clear/unmount revokes owned URLs. */
export function useFileTransfer({adapter,concurrency=2}:{adapter:TransferAdapter;concurrency?:number}){
 const scope=useNovaScope();
 const strings=scope.strings.feedback as typeof scope.strings.feedback & Partial<Record<'transferError'|'transferMissingDownload'|'transferBlobReady'|'transferBrowserHandoff',string>>;
 const vi=scope.locale.toLowerCase().startsWith('vi');
 const messages:TransferMessages=useMemo(()=>({error:strings.transferError??(vi?'Không thể truyền tệp này.':'Unable to transfer this file.'),missing:strings.transferMissingDownload??(vi?'Cần bộ điều hợp tải xuống.':'A download adapter is required.'),blob:strings.transferBlobReady??(vi?'Tệp đã sẵn sàng cho ứng dụng.':'File ready for your application.'),handoff:strings.transferBrowserHandoff??(vi?'Đã chuyển sang trình duyệt.':'Handed to your browser.')}),[strings,vi]);
 const stableAdapter=useMemo(()=>({upload:adapter.upload,download:adapter.download}),[adapter.upload,adapter.download]);
 if(!Number.isSafeInteger(concurrency)||concurrency<1)throw new RangeError('File transfer concurrency must be a positive finite integer.');
 const [queue]=useState(()=>new TransferQueue(adapter,concurrency,messages));
 const items=useSyncExternalStore(queue.subscribe,queue.getSnapshot,queue.getSnapshot);
 // Insertion commits publish ownership silently before descendant layout; layout flushes dispatch abort listeners.
 useInsertionEffect(()=>{queue.configure(stableAdapter,concurrency,messages);},[queue,stableAdapter,concurrency,messages]);
 useLayoutEffect(()=>{queue.activate();return queue.disconnect;},[queue]);
 useLayoutEffect(()=>{queue.flush();},[queue,stableAdapter,concurrency,messages]);
 // Preview requests only allocate after a committed render, never in the accessor.
 useLayoutEffect(()=>{queue.flushPreviews();});
 // Permanent invalidation is immediate; the paired layout disconnect drains deferred abort callbacks.
 useInsertionEffect(()=>queue.dispose,[queue]);
 return {items,enqueue:queue.enqueue,cancel:queue.cancel,retry:queue.retry,download:queue.download,preview:queue.preview,clear:queue.clear};
}
