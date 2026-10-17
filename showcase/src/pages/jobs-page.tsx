import {useCallback,useMemo,useRef,useState} from 'react';
import {TaskProvider} from '@sdcorejs/nova/task-provider';
import {useTask,type TaskState,type TaskSource} from '@sdcorejs/nova/task';
import {JobProgress} from '@sdcorejs/nova/job-progress';
import {useStoredState} from '@sdcorejs/nova/stored-state';
import {createLocalStorageAdapter} from '@sdcorejs/nova/adapters/storage';
import {Card} from '@sdcorejs/nova/card';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Button} from '@sdcorejs/nova/button';
import {PageHeading,type Locale} from '../navigation.js';
const encode=(value:boolean)=>JSON.stringify(value);
const decode=(value:string)=>{const parsed:unknown=JSON.parse(value);if(typeof parsed!=='boolean')throw Error('Invalid preference');return parsed;};
export function JobsPage({locale}:{locale:Locale}){const t=(vi:string,en:string)=>locale==='vi'?vi:en;return <><PageHeading title={t('Theo dõi từng bước.','Follow every step.')} intro={t('Tác vụ minh họa trong trang, hủy có xác nhận và tùy chọn không nhạy cảm lưu trên máy này.','An in-page sample task, acknowledged cancellation and non-sensitive preferences saved on this device.')}/><TaskProvider><TaskDemo locale={locale}/></TaskProvider><Preferences locale={locale}/></>;}
function TaskDemo({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en;
 const listeners=useRef(new Set<(state:TaskState<string>)=>void>()),current=useRef<TaskState<string>>({id:'sample',status:'running',progress:35});
 const [ack,setAck]=useState(false),[answer,setAnswer]=useState('—'),[subscriptions,setSubscriptions]=useState(0);
 const source=useMemo<TaskSource<string>>(()=>({mode:'stream',subscribe:(_id,onState)=>{listeners.current.add(onState);setSubscriptions(count=>count+1);onState(current.current);return()=>{listeners.current.delete(onState);};}}),[]);
 const cancel=useCallback(async()=>{setAnswer(ack?'Acknowledged':'Declined');if(ack){current.current={id:'sample',status:'cancelled'};for(const listener of listeners.current)listener(current.current);}return ack;},[ack]);
 const task=useTask({id:'sample',scopeKey:'showcase-local-job',source,cancel});
 function finish(){current.current={id:'sample',status:'succeeded',progress:100,result:t('Đã hoàn thành ví dụ cục bộ.','Local sample complete.')};for(const listener of listeners.current)listener(current.current);}
 return <Card className="showcase-demo"><h2>{t('Tác vụ cục bộ','Local task')}</h2><JobProgress state={task.state} label={t('Chuẩn bị báo cáo mẫu','Prepare sample report')} connection={task.connection} onCancel={()=>{void task.cancel();}} onRetry={task.retry} renderResult={result=><p>{result}</p>}/><Checkbox label={t('Xác nhận yêu cầu hủy','Acknowledge cancellation')} value={ack} onValueChange={value=>setAck(value===true)}/><Button variant="secondary" disabled={task.state.status!=='running'} onClick={finish}>{t('Hoàn thành ví dụ','Complete sample')}</Button><div className="showcase-p2-summary"><output aria-label="Cancellation acknowledgement">{answer}</output><output aria-label="Task status">{task.state.status}</output><span>{t('Số đăng ký','Subscriptions')}: {subscriptions}</span></div><p className="showcase-page-intro">{t('Không có máy chủ hoặc bộ hẹn giờ. Yêu cầu hủy bị từ chối không kết thúc tác vụ.','No server or timers. A declined cancellation keeps the task running.')}</p></Card>;
}
function Preferences({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en,adapter=useMemo(()=>createLocalStorageAdapter(),[]);
 const preference=useStoredState({key:'compact-results',scopeKey:'nova-showcase-demo',version:1,initial:false,adapter,encode,decode});
 return <Card className="showcase-demo"><h2>{t('Tùy chọn trên máy này','Preferences on this device')}</h2><Checkbox label={t('Kết quả gọn','Compact results')} disabled={preference.status==='loading'} value={preference.value} onValueChange={value=>preference.setValue(value===true)}/><p>{t('Trạng thái lưu','Storage status')}: <output aria-label="Preference status">{preference.status}</output></p><Button variant="secondary" onClick={()=>{void preference.reset();}}>{t('Đặt lại tùy chọn','Reset preference')}</Button>{preference.status==='error'&&<p role="alert">{t('Không thể lưu tùy chọn trên máy này.','This device could not save the preference.')}</p>}</Card>;
}
