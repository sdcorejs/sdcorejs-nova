import type {TransferAdapter,TransferState} from './file-transfer.js';
export type TransferMessages={error:string;missing:string;blob:string;handoff:string};
type Request={id:string;name:string};
type Job={previewUrl?:string;previewRequests?:Array<(url:string|undefined)=>void>;state:TransferState;file?:File;request?:Request;controller?:AbortController;started?:boolean;resolve?:(value:Blob|void)=>void;reject?:(error:Error)=>void};
/** Instance-owned transport scheduler. Abort releases local capacity; remote deletion is never inferred. */
export class TransferQueue {
 private jobs:Job[]=[];
 private listeners=new Set<()=>void>();
 private snapshot:readonly TransferState[]=[];
 private sequence=0;
 private active=true;
 private disposed=false;
 private committed=false;
 private committing=false;
 private pendingNotification=false;
 private pendingAborts=new Set<AbortController>();
 private adapter:TransferAdapter;
 private concurrency:number;
 private messages:TransferMessages;
 constructor(adapter:TransferAdapter,concurrency:number,messages:TransferMessages){this.adapter=adapter;this.concurrency=concurrency;this.messages=messages;}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
 activate=()=>{if(this.disposed)return;this.active=true;this.flush();};
 /** Commit phase updates are silent; React subscriptions are notified only in layout/event work. */
 flush=()=>{if(this.committing)return;this.dispatchAborts();if(!this.active)return;if(this.pendingNotification){this.pendingNotification=false;for(const listener of this.listeners)listener();}this.pump();};
 /** Effect disconnection pauses work which has not reached the transport. Started attempts abort locally. */
 disconnect=()=>{this.active=false;let changed=false;for(const job of this.jobs){if(job.state.status!=='running')continue;if(job.started)this.stop(job);else{job.controller?.abort();job.state={...job.state,status:'queued'};}changed=true;}if(changed)this.emit();this.dispatchAborts();};
 /** Insertion cleanup invalidates ownership before sibling layout callbacks, without invoking consumer listeners. */
 dispose=()=>{this.disposed=true;this.active=false;this.committing=true;try{this.clear();}finally{this.committing=false;}};
 configure(adapter:TransferAdapter,concurrency:number,messages:TransferMessages){
  if(this.disposed)return;
  this.committed=true;
  // Publish committed transport before any descendant layout submission. Only jobs
  // accepted under the preceding transport are invalidated, including reentrant abort listeners.
  const previous=this.adapter,precedingJobs=[...this.jobs];
  this.committing=true;this.adapter=adapter;this.concurrency=concurrency;this.messages=messages;
  try {
   let changed=false;
   for(const job of precedingJobs){const changedTransport=job.file?previous.upload!==adapter.upload:previous.download!==adapter.download;if(changedTransport&&['queued','running'].includes(job.state.status)){this.stop(job);changed=true;}}
   if(changed)this.emit();
  } finally {this.committing=false;}
 }
 /** Request a preview for an enrolled upload attempt. Allocation waits for committed active layout, including same-owner reveal. */
 preview=(id:string):Promise<string|undefined>=>{
  const job=this.jobs.find(item=>item.state.id===id);
  if(this.disposed||!this.committed||!job?.file)return Promise.resolve(undefined);
  if(job.previewUrl)return Promise.resolve(job.previewUrl);
  const promise=new Promise<string|undefined>(resolve=>{(job.previewRequests??=[]).push(resolve);});
  this.emit();return promise;
 };
 /** Called only from the hook's committed layout effect. */
 flushPreviews=()=>{
  if(this.disposed||!this.active||!this.committed)return;
  for(const job of this.jobs){
   if(!job.file||!job.previewRequests?.length)continue;
   const requests=job.previewRequests;job.previewRequests=undefined;
   job.previewUrl??=URL.createObjectURL(job.file);
   for(const resolve of requests)resolve(job.previewUrl);
  }
 };
 /** Clear only this instance's attempts and URLs; retained old attempt IDs become inert. */
 clear=()=>{
  const jobs=this.jobs;this.jobs=[];
  for(const job of jobs){
   if(job.state.status==='queued'||job.state.status==='running')this.stop(job);
   if(job.previewUrl){URL.revokeObjectURL(job.previewUrl);job.previewUrl=undefined;}
   for(const resolve of job.previewRequests??[])resolve(undefined);
   job.previewRequests=undefined;
  }
  this.emit();
 };
 private emit(){this.snapshot=this.jobs.map(job=>({...job.state}));if(this.active&&!this.committing){this.pendingNotification=false;for(const listener of this.listeners)listener();}else this.pendingNotification=true;}
 private make(direction:'upload'|'download',name:string):TransferState{return {id:'transfer-'+(++this.sequence),direction,name,status:'queued'};}
 // Same-owner reveal descendants submit before owner layout reconnect; retain their jobs paused.
 enqueue=(files:readonly File[])=>{if(this.disposed)return;for(const file of files)this.jobs.push({file,state:{...this.make('upload',file.name),file}});this.emit();this.pump();};
 download=(request:Request):Promise<Blob|void>=>{
  // Configuration failure is synchronous and precedes any queue entry.
  if(!this.adapter.download)throw new Error(this.messages.missing);
  if(this.disposed)return Promise.resolve();
  let resolve!:(value:Blob|void)=>void,reject!:(error:Error)=>void;
  const promise=new Promise<Blob|void>((a,b)=>{resolve=a;reject=b;});
  // An ignored consumer promise must not cause an unhandled rejection; awaiting it still rejects.
  void promise.catch(()=>{});
  this.jobs.push({request,state:this.make('download',request.name),resolve,reject});this.emit();this.pump();return promise;
 };
 cancel=(id:string)=>{const job=this.jobs.find(item=>item.state.id===id);if(!job||!['queued','running'].includes(job.state.status))return;this.stop(job);this.emit();this.pump();};
 private stop(job:Job){job.state={...job.state,status:'cancelled',progress:undefined,errorMessage:undefined};if(job.controller){if(this.committing)this.pendingAborts.add(job.controller);else job.controller.abort();}job.resolve?.();job.resolve=undefined;job.reject=undefined;}
 /** AbortSignal listeners are arbitrary consumer callbacks; invoke them only outside insertion work. */
 private dispatchAborts(){const controllers=[...this.pendingAborts];this.pendingAborts.clear();for(const controller of controllers)controller.abort();}
 retry=(id:string)=>{const job=this.jobs.find(item=>item.state.id===id);if(this.disposed||!job||!['cancelled','error'].includes(job.state.status))return;if(job.file)this.enqueue([job.file]);else if(job.request&&this.adapter.download)void this.download(job.request).catch(()=>{});};
 private pump(){
  if(!this.active||this.committing)return;
  while(this.jobs.filter(job=>job.state.status==='running').length<this.concurrency){const job=this.jobs.find(item=>item.state.status==='queued');if(!job)break;this.start(job);}
 }
 private start(job:Job){
  const controller=new AbortController();job.controller=controller;job.started=false;job.state={...job.state,status:'running'};this.emit();
  const current=()=>this.active&&!controller.signal.aborted&&job.state.status==='running';
  const ctx={signal:controller.signal,onProgress:(loaded:number,total?:number)=>{if(!current())return;const progress=Number.isFinite(loaded)&&total!==undefined&&Number.isFinite(total)&&total>0?Math.min(100,Math.max(0,loaded/total*100)):undefined;job.state={...job.state,progress};this.emit();}};
  // Capture transport identity for this attempt, before a future consumer scope change.
  const upload=this.adapter.upload,download=this.adapter.download;
  void Promise.resolve().then(async()=>{
   if(!current())return;
   job.started=true;
   if(job.file){await upload(job.file,ctx);return;}
   return download!(job.request!,ctx);
  }).then(value=>{
   if(!current())return;
   const outcome=job.state.direction==='download'?(value===undefined?'browser-handoff':'blob'):undefined;
   job.state={...job.state,status:'success',outcome,statusMessage:outcome==='blob'?this.messages.blob:outcome==='browser-handoff'?this.messages.handoff:undefined};
   if(job.state.direction==='download')job.resolve?.(value);
   job.resolve=undefined;job.reject=undefined;this.emit();this.pump();
  },()=>{
   if(!current())return;
   job.state={...job.state,status:'error',errorMessage:this.messages.error};job.reject?.(new Error(this.messages.error));job.resolve=undefined;job.reject=undefined;this.emit();this.pump();
  });
 }
}
