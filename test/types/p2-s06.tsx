import {useTask,type TaskState,type TaskSource,type UseTaskOptions,type UseTaskResult} from '@sdcorejs/nova/task';
import {TaskProvider,type TaskProviderProps} from '@sdcorejs/nova/task-provider';
import {JobProgress,type JobProgressProps} from '@sdcorejs/nova/job-progress';
import {JobProgress as RootJobProgress,TaskProvider as RootTaskProvider,useTask as rootUseTask} from '@sdcorejs/nova';
// case-p2-s06-ac01-types: public package resolution belongs to parent phase 3.
const raw={fn:()=>false,n:0};
const state:TaskState<typeof raw>={id:'job',status:'running',result:raw};
const source:TaskSource<typeof raw>={mode:'poll',load:async({id,signal})=>{const abort:boolean=signal.aborted;void abort;return{id,status:'succeeded',result:raw};},intervalMs:1000};
const options:UseTaskOptions<typeof raw>={id:'job',scopeKey:'account',source,initialState:state,cancel:async id=>id==='job'};
function Consumer(){const result:UseTaskResult<typeof raw>=useTask(options);const job:JobProgressProps<typeof raw>={label:'Export',state:result.state,connection:result.connection,onRetry:result.retry,onCancel:()=>void result.cancel(),renderResult:value=><span>{String(value.fn())}</span>};return <TaskProvider><JobProgress {...job}/></TaskProvider>;}
<Consumer/>;<RootTaskProvider><RootJobProgress label="Export" state={state}/></RootTaskProvider>;void rootUseTask;const provider:TaskProviderProps={children:null};void provider;
const stream:TaskSource<typeof raw>={mode:'stream',subscribe:(id,onState,onError)=>{onState({id,status:'running',result:raw});onError(new Error('consumer'));return()=>{};}};void stream;
function MissingScope(){
 // @ts-expect-error scope is required
 useTask({id:'job',source});return null;
}void MissingScope;
// @ts-expect-error mode discriminant rejects mixed transports
const mixed:TaskSource<number>={mode:'poll',load:async({id})=>({id,status:'running'}),subscribe:()=>()=>{}};void mixed;
// @ts-expect-error subscribe must return cleanup
const missingCleanup:TaskSource<number>={mode:'stream',subscribe:()=>{}};void missingCleanup;
// @ts-expect-error cancellation acknowledgement is boolean
const badCancel:UseTaskOptions<typeof raw>={...options,cancel:async()=>state};void badCancel;
// @ts-expect-error status is a closed union
const badState:TaskState<number>={id:'job',status:'complete'};void badState;
// @ts-expect-error meaningful progress name required
<JobProgress state={state}/>;
// @ts-expect-error raw generic result is not a string
<JobProgress label="Export" state={state} renderResult={(value:string)=><span>{value}</span>}/>;
// @ts-expect-error presentational component has no implicit source
<JobProgress label="Export" state={state} source={source}/>;
function InvalidEndpoint(){
 // @ts-expect-error no auth/backend configuration
 useTask({...options,endpoint:'/jobs'});return null;
}void InvalidEndpoint;
// @ts-expect-error narrow props reject raw HTML
const unsafe:JobProgressProps<typeof raw>={label:'Export',state,dangerouslySetInnerHTML:{__html:'unsafe'}};void unsafe;
