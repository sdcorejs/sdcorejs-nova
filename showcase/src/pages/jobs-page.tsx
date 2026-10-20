import {useCallback,useMemo,useRef,useState} from 'react';
import {TaskProvider} from '@sdcorejs/nova/task-provider';
import {useTask,type TaskState,type TaskSource,type TaskStatus} from '@sdcorejs/nova/task';
import {JobProgress} from '@sdcorejs/nova/job-progress';
import {useStoredState} from '@sdcorejs/nova/stored-state';
import {createLocalStorageAdapter} from '@sdcorejs/nova/adapters/storage';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Button} from '@sdcorejs/nova/button';
import {Badge} from '@sdcorejs/nova/badge';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';

const encode=(value:boolean)=>JSON.stringify(value);
const decode=(value:string)=>{const parsed:unknown=JSON.parse(value);if(typeof parsed!=='boolean')throw Error('Invalid preference');return parsed;};
const STATUS:Record<TaskStatus,{vi:string;en:string;tone:'neutral'|'info'|'success'|'error'}>={
 idle:{vi:'Chưa bắt đầu',en:'Not started',tone:'neutral'},queued:{vi:'Đang chờ',en:'Queued',tone:'neutral'},running:{vi:'Đang thực hiện',en:'In progress',tone:'info'},
 succeeded:{vi:'Hoàn tất',en:'Completed',tone:'success'},failed:{vi:'Thất bại',en:'Failed',tone:'error'},cancelled:{vi:'Đã hủy',en:'Cancelled',tone:'neutral'},
};
const StatusBadge=({t,status}:{t:Translate;status:TaskStatus})=><Badge tone={STATUS[status].tone}>{t(STATUS[status].vi,STATUS[status].en)}</Badge>;
export function JobsPage({locale}:{locale:Locale}){
 const t=translator(locale),adapter=useMemo(()=>createLocalStorageAdapter(),[]);
 const preference=useStoredState({key:'compact-results',scopeKey:'nova-showcase-demo',version:1,initial:false,adapter,encode,decode});
 return <>
  <PageHead eyebrow={labels[locale].jobs} title={t('Tác vụ chạy nền','Background jobs')} intro={t('Theo dõi xuất báo cáo lương, đồng bộ chấm công và gửi email hàng loạt với trạng thái dễ đọc.','Follow a payroll export, an attendance sync and a bulk email with readable statuses.')}/>
  <TaskProvider><TaskList t={t} compact={preference.value}/></TaskProvider>
  <Preferences t={t} preference={preference}/>
 </>;
}

function TaskList({t,compact}:{t:Translate;compact:boolean}){
 const listeners=useRef(new Set<(state:TaskState<string>)=>void>()),current=useRef<TaskState<string>>({id:'payroll-export',status:'running',progress:35});
 const [ack,setAck]=useState(false),[answer,setAnswer]=useState('—'),[subscriptions,setSubscriptions]=useState(0),[mail,setMail]=useState<TaskStatus>('failed');
 const source=useMemo<TaskSource<string>>(()=>({mode:'stream',subscribe:(_id,onState)=>{listeners.current.add(onState);setSubscriptions(count=>count+1);onState(current.current);return()=>{listeners.current.delete(onState);};}}),[]);
 const cancel=useCallback(async()=>{setAnswer(ack?'Acknowledged':'Declined');if(ack){current.current={id:'payroll-export',status:'cancelled'};for(const listener of listeners.current)listener(current.current);}return ack;},[ack]);
 const task=useTask({id:'payroll-export',scopeKey:'showcase-payroll-export',source,cancel});
 function finish(){current.current={id:'payroll-export',status:'succeeded',progress:100,result:'bao-cao-luong-2026-10.xlsx'};for(const listener of listeners.current)listener(current.current);}
 return <DemoCard data-testid="task-demo" title={t('Tác vụ đang chạy','Running jobs')} meta={t('Tác vụ vẫn chạy khi bạn rời trang.','Jobs keep running when you leave the page.')}>
  <ul className={compact?'showcase-jobs showcase-jobs--compact':'showcase-jobs'}>
   <li>
    <span className="showcase-list__icon"><Icon name="file"/></span>
    <div className="showcase-jobs__body">
     <JobProgress state={task.state} label={t('Xuất báo cáo lương tháng 10','Export October payroll report')} connection={task.connection} onCancel={()=>{void task.cancel();}} onRetry={task.retry} renderResult={file=><p className="showcase-meta">{t('Tệp sẵn sàng: ','File ready: ')}{file}</p>}/>
     {task.state.status==='cancelled'?<p className="showcase-meta">{t('Đã dừng theo yêu cầu. Chưa có tệp nào được tạo.','Stopped on request. No file was created.')}</p>:null}
    </div>
    <StatusBadge t={t} status={task.state.status}/>
   </li>
   <li>
    <span className="showcase-list__icon"><Icon name="refresh"/></span>
    <div className="showcase-jobs__body"><strong>{t('Đồng bộ chấm công','Attendance sync')}</strong><span className="showcase-meta">{t('248 bản ghi · xong lúc 09:12','248 records · finished at 09:12')}</span><a className="showcase-link" href="#/data">{t('Xem danh sách nhân sự','View the employee list')}</a></div>
    <StatusBadge t={t} status="succeeded"/>
   </li>
   <li>
    <span className="showcase-list__icon"><Icon name="users"/></span>
    <div className="showcase-jobs__body"><strong>{t('Gửi email chào mừng hàng loạt','Bulk welcome email')}</strong>
     {mail==='failed'?<><span className="showcase-error-text">{t('12 / 40 email không gửi được: hộp thư người nhận đã đầy.','12 of 40 emails failed: recipient mailboxes are full.')}</span><span><Button variant="secondary" size="sm" onClick={()=>setMail('queued')}>{t('Thử lại 12 email','Retry 12 emails')}</Button></span></>:<span className="showcase-meta">{t('12 email đã vào hàng đợi gửi lại.','12 emails are queued for another attempt.')}</span>}
    </div>
    <StatusBadge t={t} status={mail}/>
   </li>
  </ul>
  <TechDetails t={t} topic={t('trạng thái tác vụ và mô phỏng','task state and simulation')}>
   <p className="showcase-meta">{t('Không có máy chủ hay bộ hẹn giờ: hai điều khiển dưới đây đóng vai máy chủ. Yêu cầu hủy bị từ chối thì tác vụ vẫn chạy.','There is no server or timer: the two controls below play the server. A declined cancellation keeps the job running.')}</p>
   <Checkbox label={t('Máy chủ chấp nhận yêu cầu hủy','Acknowledge cancellation')} value={ack} onValueChange={value=>setAck(value===true)}/>
   <div><Button variant="secondary" size="sm" disabled={task.state.status!=='running'} onClick={finish}>{t('Hoàn tất tác vụ','Complete the job')}</Button></div>
   <TechRow label="Task status"><output aria-label="Task status">{task.state.status}</output></TechRow>
   <TechRow label="Cancellation acknowledgement"><output aria-label="Cancellation acknowledgement">{answer}</output></TechRow>
   <TechRow label="subscriptions"><code>{subscriptions}</code></TechRow>
   <TechRow label="TaskState"><code>{JSON.stringify({'payroll-export':task.state,'attendance-sync':{status:'succeeded'},'welcome-mail':{status:mail,failed:mail==='failed'?12:0}})}</code></TechRow>
  </TechDetails>
 </DemoCard>;
}

type Preference=ReturnType<typeof useStoredState<boolean>>;
function Preferences({t,preference}:{t:Translate;preference:Preference}){
 const status=preference.status==='loading'?t('Đang đọc tùy chọn…','Reading the preference…'):preference.status==='ready'?t('Đã lưu trên trình duyệt này.','Saved in this browser.'):t('Không lưu được tùy chọn trên máy này.','This device could not save the preference.');
 return <DemoCard title={t('Tùy chọn trên máy này','Preferences on this device')} meta={t('Chỉ lưu tùy chọn không nhạy cảm.','Only non-sensitive preferences are stored.')}
  footer={<><p className="showcase-meta" role="status">{status}</p><Button variant="secondary" onClick={()=>{void preference.reset();}}>{t('Đặt lại tùy chọn','Reset preference')}</Button></>}>
  <Checkbox label={t('Hiển thị kết quả dạng gọn','Compact results')} description={t('Danh sách tác vụ phía trên dùng dòng thấp hơn.','The job list above uses shorter rows.')} disabled={preference.status==='loading'} value={preference.value} onValueChange={value=>preference.setValue(value===true)}/>
  {preference.status==='error'&&<p role="alert">{t('Không thể lưu tùy chọn trên máy này.','This device could not save the preference.')}</p>}
  <TechDetails t={t}><TechRow label="Preference status"><output aria-label="Preference status">{preference.status}</output></TechRow></TechDetails>
 </DemoCard>;
}
