'use client';
import {useId,type ReactNode,type Ref} from 'react';
import type {SurfaceProps} from '../../types/index.js';
import type {TaskState,TaskConnection} from '../../hooks/task/task.js';
import {useNovaScope} from '../../providers/nova/context.js';
import {Progress} from '../data-state/progress.js';
import {Button} from '../button/button.js';
import {cx} from '../../lib/cx.js';
export type JobProgressProps<T>=SurfaceProps&{state:TaskState<T>;label:string;connection?:TaskConnection;onRetry?:()=>void;onCancel?:()=>void;disabled?:boolean;safeMessage?:ReactNode;renderResult?:(result:T)=>ReactNode;ref?:Ref<HTMLDivElement>};
const messages={
 en:{jobIdle:'Not started',jobQueued:'Queued',jobRunning:'Running',jobSucceeded:'Completed',jobFailed:'Failed',jobCancelled:'Cancelled',jobReconnecting:'Reconnecting',jobConnectionError:'Connection lost. Try again.',jobRetry:'Retry connection',jobCancel:'Cancel task'},
 vi:{jobIdle:'Chưa bắt đầu',jobQueued:'Đang chờ',jobRunning:'Đang thực hiện',jobSucceeded:'Hoàn tất',jobFailed:'Thất bại',jobCancelled:'Đã hủy',jobReconnecting:'Đang kết nối lại',jobConnectionError:'Mất kết nối. Hãy thử lại.',jobRetry:'Thử kết nối lại',jobCancel:'Hủy tác vụ'},
};
type Messages=typeof messages.en;
const statusKeys={idle:'jobIdle',queued:'jobQueued',running:'jobRunning',succeeded:'jobSucceeded',failed:'jobFailed',cancelled:'jobCancelled'} as const;
/** Presentation only: safe messages and actions are explicit consumer inputs. */
export function JobProgress<T>({state,label,connection='idle',onRetry,onCancel,disabled,safeMessage,renderResult,className,style,'data-testid':testId,ref}:JobProgressProps<T>){
 const scope=useNovaScope(),id=useId(),fallback=scope.locale.toLowerCase().startsWith('vi')?messages.vi:messages.en;
 const strings:typeof scope.strings.feedback&Partial<Messages>=scope.strings.feedback;
 const text=(key:keyof Messages)=>strings[key]??fallback[key];
 const final=state.status==='succeeded'||state.status==='failed'||state.status==='cancelled';
 return <div ref={ref} className={cx('nova-job-progress',className)} style={style} data-testid={testId} aria-labelledby={id}>
  <Progress label={label} value={state.progress}/>
  <p id={id} role="status" aria-live="polite" aria-atomic="true" className="nova-job-progress__status" data-status={state.status} data-connection={connection!=='idle'&&!final?connection:undefined}>{text(statusKeys[state.status])}{connection==='reconnecting'&&!final?<> — {text('jobReconnecting')}</>:null}</p>
  {connection==='error'&&!final?<p role="alert">{text('jobConnectionError')}</p>:null}
  {safeMessage!==undefined?<div className="nova-job-progress__message">{safeMessage}</div>:null}
  {!final&&(onCancel||(connection==='error'&&onRetry))?<div className="nova-job-progress__actions">
   {connection==='error'&&onRetry?<Button variant="secondary" size="sm" disabled={disabled} onClick={onRetry}>{text('jobRetry')}</Button>:null}
   {onCancel?<Button variant="ghost" size="sm" disabled={disabled} onClick={onCancel}>{text('jobCancel')}</Button>:null}
  </div>:null}
  {state.status==='succeeded'&&state.result!==undefined&&renderResult?renderResult(state.result):null}
 </div>;
}
