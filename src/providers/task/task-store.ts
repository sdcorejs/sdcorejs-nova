import type {DiagnosticOwner} from '../../lib/diagnostics.js';

export type TaskStatus='idle'|'queued'|'running'|'succeeded'|'failed'|'cancelled';
export type TaskState<T>={id:string;status:TaskStatus;progress?:number;result?:T;message?:string};
export type TaskSource<T>=
 |{mode:'poll';load:(ctx:{id:string;signal:AbortSignal})=>Promise<TaskState<T>>;intervalMs?:number}
 |{mode:'stream';subscribe:(id:string,onState:(state:TaskState<T>)=>void,onError:(error:unknown)=>void)=>()=>void};
export type TaskConnection='idle'|'open'|'reconnecting'|'error';
export type TaskSnapshot<T>={state:TaskState<T>;connection:TaskConnection};
const statuses:readonly TaskStatus[]=['idle','queued','running','succeeded','failed','cancelled'];
const rank:Record<TaskStatus,number>={idle:0,queued:1,running:2,succeeded:3,failed:3,cancelled:3};
export function terminal(status:TaskStatus):boolean{return rank[status]===3;}

declare const process:{env:{NODE_ENV?:string}};
/** Static, owner-deduplicated diagnostics. Never include job IDs, payloads or errors. */
function warn(owner:DiagnosticOwner):void{
 try{if(process.env.NODE_ENV==='production')return;}catch{/* Browser ESM has no process global. */}
 const key='NOVA_TASK_INVALID_STATE|useTask';if(owner.seen.has(key))return;owner.seen.add(key);
 console.warn('[nova] NOVA_TASK_INVALID_STATE <useTask>: mismatched, invalid or regressive task state ignored');
}
function valid<T>(state:TaskState<T>,id:string):boolean{return !!state&&state.id===id&&statuses.includes(state.status);}

/** No transport starts until a subscriber commits. Every lifetime has its own generation. */
export class TaskStore<T>{
 private snapshot:TaskSnapshot<T>;
 private readonly serverSnapshot:TaskSnapshot<T>;
 private listeners=new Set<()=>void>();
 private generation=0;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private controller:AbortController|undefined;
 private unsubscribe:(()=>void)|undefined;
 private visibility:(()=>void)|undefined;
 private failures=0;
 private reading=false;
 private readonly interval:number;
 constructor(readonly id:string,private source:TaskSource<T>,initial:TaskState<T>|undefined,private diagnostics:DiagnosticOwner){
  this.snapshot={state:initial&&valid(initial,id)?initial:{id,status:'idle'},connection:'idle'};
  this.serverSnapshot=this.snapshot;
  this.interval=source.mode==='poll'&&Number.isFinite(source.intervalMs)?Math.max(1000,source.intervalMs??1000):1000;
 }
 getSnapshot=()=>this.snapshot;
 getServerSnapshot=()=>this.serverSnapshot;
 get active():boolean{return this.listeners.size>0;}
 subscribe=(listener:()=>void)=>{
  this.listeners.add(listener);
  if(this.listeners.size===1)this.start();
  let removed=false;
  return()=>{if(removed)return;removed=true;this.listeners.delete(listener);if(!this.active)this.stop();};
 };
 private publish(state=this.snapshot.state,connection=this.snapshot.connection){
  if(state===this.snapshot.state&&connection===this.snapshot.connection)return;
  this.snapshot={state,connection};for(const listener of this.listeners)listener();
 }
 private current(generation:number):boolean{return this.active&&generation===this.generation;}
 private releaseStream(){const stop=this.unsubscribe;this.unsubscribe=undefined;stop?.();}
 private stop(){
  ++this.generation;
  if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
  const controller=this.controller;this.controller=undefined;controller?.abort();
  this.releaseStream();
  if(this.visibility&&typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibility);
  this.visibility=undefined;this.reading=false;
 }
 private accept(state:TaskState<T>,generation:number){
  if(!this.current(generation))return;
  if(!valid(state,this.id)||rank[state.status]<rank[this.snapshot.state.status]||terminal(this.snapshot.state.status)){warn(this.diagnostics);return;}
  this.publish(state,'open');
  if(terminal(state.status))this.stop();
 }
 private schedule(delay:number,generation:number){
  if(!this.current(generation)||terminal(this.snapshot.state.status))return;
  this.timer=setTimeout(()=>{this.timer=undefined;void this.poll(generation);},delay);
 }
 private async poll(generation:number){
  if(!this.current(generation)||this.reading||this.source.mode!=='poll')return;
  if(typeof document!=='undefined'&&document.visibilityState==='hidden'){this.schedule(this.interval,generation);return;}
  this.reading=true;const controller=new AbortController();this.controller=controller;
  let delay=this.interval;
  try{
   const state=await this.source.load({id:this.id,signal:controller.signal});
   if(!this.current(generation))return;
   this.failures=0;this.accept(state,generation);
  }catch{
   if(!this.current(generation)||controller.signal.aborted)return;
   this.failures++;
   this.publish(this.snapshot.state,this.failures<=3?'reconnecting':'error');
   delay=Math.min(30000,1000*2**(this.failures-1)+Math.random()*500);
  }finally{
   if(this.current(generation)){
    this.reading=false;this.controller=undefined;
    if(this.failures<=3)this.schedule(delay,generation);
   }
  }
 }
 private start(){
  if(!this.active||terminal(this.snapshot.state.status))return;
  const generation=++this.generation;this.failures=0;
  if(this.source.mode==='poll'){
   this.publish(this.snapshot.state,'open');
   if(typeof document!=='undefined'){
    this.visibility=()=>{if(document.visibilityState==='visible'&&this.current(generation)&&!this.reading&&this.snapshot.connection!=='error'){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;void this.poll(generation);}};
    document.addEventListener('visibilitychange',this.visibility);
   }
   void this.poll(generation);
  }else{
   this.publish(this.snapshot.state,'open');
   const fail=()=>{if(!this.current(generation))return;this.publish(this.snapshot.state,'error');this.stop();};
   try{
    const stop=this.source.subscribe(this.id,state=>this.accept(state,generation),fail);
    // A synchronous terminal/error may invalidate ownership before subscribe returns.
    if(this.current(generation))this.unsubscribe=stop;else stop();
   }catch{fail();}
  }
 }
 retry=()=>{
  if(!this.active||terminal(this.snapshot.state.status)||this.reading)return;
  if(this.snapshot.connection!=='error'&&this.snapshot.connection!=='reconnecting')return;
  this.stop();this.start();
 };
}

export type TaskSubscription<T>=Pick<TaskStore<T>,'getSnapshot'|'getServerSnapshot'|'subscribe'|'active'|'retry'>;
type Entry={scopeKey:string;id:string;mode:TaskSource<unknown>['mode'];transport:object;store:unknown;subscribers:number};
/** Only committed subscriptions own registry entries. Render candidates never register. */
export class TaskRegistry{
 private entries:Entry[]=[];
 private acquire<T>(scopeKey:string,id:string,source:TaskSource<T>,candidate:TaskStore<T>){
  const transport=source.mode==='poll'?source.load:source.subscribe;
  let entry=this.entries.find(item=>item.scopeKey===scopeKey&&item.id===id&&item.mode===source.mode&&item.transport===transport);
  if(!entry){entry={scopeKey,id,mode:source.mode,transport,store:candidate,subscribers:0};this.entries.push(entry);}
  const owned=entry;owned.subscribers++;
  return {store:owned.store as TaskStore<T>,release:()=>{owned.subscribers--;if(owned.subscribers===0)this.entries=this.entries.filter(item=>item!==owned);}};
 }
 get<T>(scopeKey:string,id:string,source:TaskSource<T>,initial:TaskState<T>|undefined,diagnostics:DiagnosticOwner):TaskSubscription<T>{
  const candidate=new TaskStore(id,source,initial,diagnostics);let current=candidate,subscriptions=0;
  return {
   getSnapshot:()=>current.getSnapshot(),
   getServerSnapshot:candidate.getServerSnapshot,
   get active(){return subscriptions>0;},
   subscribe:listener=>{
    // Activity/StrictMode may reconnect this retained handle after another owner commits.
    const lease=this.acquire(scopeKey,id,source,current);current=lease.store;subscriptions++;
    const unsubscribe=current.subscribe(listener);let removed=false;
    return()=>{if(removed)return;removed=true;subscriptions--;try{unsubscribe();}finally{lease.release();}};
   },
   retry:()=>{if(subscriptions>0)current.retry();},
  };
 }
}
