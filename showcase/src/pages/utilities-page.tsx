import {useRef,useState} from 'react';
import {CopyButton} from '@sdcorejs/nova/copy-button';
import {ScrollArea} from '@sdcorejs/nova/scroll-area';
import {Highlight} from '@sdcorejs/nova/highlight';
import {View,ReadOnlyValue} from '@sdcorejs/nova/read-only-value';
import {useFormatter,useRelativeTime} from '@sdcorejs/nova/formatter';
import {useMediaQuery,useViewport} from '@sdcorejs/nova/viewport';
import {useAsyncAction} from '@sdcorejs/nova/async-action';
import {BusyBoundary} from '@sdcorejs/nova/busy-boundary';
import {useFormValidation} from '@sdcorejs/nova/form-validation';
import {UnsavedChangesProvider,useUnsavedChanges,useConfirmLeave,type LeavePrompt} from '@sdcorejs/nova/unsaved-changes';
import {Dialog} from '@sdcorejs/nova/dialog';
import {Input} from '@sdcorejs/nova/input';
import {Button} from '@sdcorejs/nova/button';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';

const NOTES=[
 {vi:'Bàn giao laptop cũ cho phòng Hạ tầng trước 31/10.',en:'Return the old laptop to Infrastructure by 31 Oct.'},
 {vi:'Đăng ký chỗ gửi xe tầng hầm B2.',en:'Book a B2 basement parking spot.'},
 {vi:'Cập nhật số tài khoản nhận lương mới.',en:'Update the new salary bank account.'},
 {vi:'Hoàn thành khóa An toàn thông tin trước 15/11.',en:'Finish the information security course by 15 Nov.'},
 {vi:'Gửi bản scan bằng thạc sĩ cho phòng Nhân sự.',en:'Send the master degree scan to HR.'},
 {vi:'Xác nhận lịch đánh giá thử việc với quản lý.',en:'Confirm the probation review date with the manager.'},
];
export function UtilitiesPage({locale}:{locale:Locale}){
 const t=translator(locale),format=useFormatter(),relative=useRelativeTime('2026-10-20T01:12:00Z',{now:'2026-10-20T03:12:00Z'}),wide=useMediaQuery('(min-width: 640px)'),viewport=useViewport();
 return <>
  <PageHead eyebrow={labels[locale].utilities} title={t('Tiện ích hằng ngày','Everyday utilities')} intro={t('Giá trị chỉ đọc, sao chép, đánh dấu từ khóa, thời gian tương đối và bảo vệ bản nháp.','Read-only values, copy, search highlighting, relative time and draft protection.')}/>
  <div className="showcase-cols">
   <DemoCard title={t('Thông tin nhanh','Quick facts')} meta="Nguyễn An" actions={<CopyButton text="NV-10240" label={t('Sao chép mã nhân viên','Copy employee ID')}/>}>
    <div className="showcase-info-list">
     <View label={t('Mã nhân viên','Employee ID')} value="NV-10240" display={<span className="showcase-mono">NV-10240</span>}/>
     <View label={t('Số dư phép','Leave balance')} value={7.5} display={t(format.number(7.5)+' ngày',format.number(7.5)+' days')}/>
     <ReadOnlyValue label={t('Cập nhật','Updated')} value="2026-10-20T01:12:00Z" display={<>{relative} · <span className="showcase-num showcase-muted">{format.instant('2026-10-20T01:12:00Z',{dateStyle:'short',timeStyle:'short'})}</span></>}/>
     <View label={t('Tìm “dang”','Search “dang”')} value="dang" display={<Highlight text="Đặng Thùy Trang · Lê Minh Đăng · Trần Hải Đăng" term="dang"/>}/>
    </div>
    <h3>{t('Việc cần làm khi nhận việc','Onboarding to-dos')}</h3><ScrollArea label={t('Việc cần làm khi nhận việc','Onboarding to-dos')} maxHeight="140px"><ol className="showcase-ordered">{NOTES.map(note=><li key={note.en}>{t(note.vi,note.en)}</li>)}</ol></ScrollArea>
    <TechDetails t={t} topic={t('khung nhìn','viewport')}><TechRow label="(min-width: 640px)"><code>{String(wide)}</code></TechRow><TechRow label="viewport.width"><code>{viewport.width??'—'}px</code></TechRow></TechDetails>
   </DemoCard>
   <DemoCard title={t('Bảo vệ thay đổi','Protect changes')} meta={t('Rời trang khi còn bản nháp sẽ được hỏi lại.','Leaving with a draft asks you first.')}>
    <UnsavedChangesProvider renderPrompt={request=><LeaveDialog request={request} t={t}/>}><Draft t={t}/></UnsavedChangesProvider>
   </DemoCard>
  </div>
  <DemoCard title={t('Thao tác có trạng thái','Actions with feedback')} meta={t('Đồng bộ hồ sơ và kiểm tra mã số thuế.','Profile sync and tax code check.')}>
   <div className="showcase-cols">
    <Sync t={t}/>
    <Validation t={t}/>
   </div>
  </DemoCard>
 </>;
}

function Sync({t}:{t:Translate}){
 const [result,setResult]=useState('');
 const action=useAsyncAction(async({signal})=>{await new Promise(resolve=>setTimeout(resolve,600));signal.throwIfAborted();return 'done';});
 return <BusyBoundary busy={action.pending} label={t('Đang đồng bộ hồ sơ','Syncing the profile')}>
  <div className="showcase-stack">
   <h3>{t('Đồng bộ với hệ thống chấm công','Sync with the attendance system')}</h3>
   <div className="showcase-toolbar"><Button variant="secondary" loading={action.pending} onClick={()=>{void action.run().then(()=>setResult(t('Đã đồng bộ 12 ngày công của tháng 10.','Synced 12 working days for October.')),()=>setResult(t('Đã dừng đồng bộ.','Sync stopped.')));}}>{t('Đồng bộ lại','Sync again')}</Button><Button variant="ghost" disabled={!action.pending} onClick={action.cancel}>{t('Dừng','Stop')}</Button></div>
   <p className="showcase-meta" role="status">{result}</p>
  </div>
 </BusyBoundary>;
}

function Validation({t}:{t:Translate}){
 const [code,setCode]=useState(''),[result,setResult]=useState('');
 const validation=useFormValidation<{code:string}>({createSnapshot:values=>Object.freeze({...values}),validate:values=>!values.code.trim()?[{field:'code',code:'required',message:t('Vui lòng nhập mã số thuế.','Enter a tax code.')}]:/^\d{10}(\d{3})?$/u.test(values.code.trim())?[]:[{field:'code',code:'format',message:t('Mã số thuế gồm 10 hoặc 13 chữ số.','A tax code has 10 or 13 digits.')}]});
 return <form className="showcase-stack" noValidate onSubmit={event=>{event.preventDefault();setResult('');void validation.validate({code}).then(value=>{if(value.status==='validated'&&!value.issues.length)setResult(t('Mã số thuế hợp lệ.','The tax code is valid.'));});}}>
  <h3>{t('Kiểm tra mã số thuế cá nhân','Check a personal tax code')}</h3>
  <Input label={t('Mã số thuế','Tax code')} inputMode="numeric" value={code} onValueChange={setCode} error={validation.issues[0]?.message} description={t('Ví dụ: 8012345678.','Example: 8012345678.')}/>
  <div className="showcase-toolbar"><Button type="submit" variant="secondary" loading={validation.pending}>{t('Kiểm tra','Check')}</Button></div>
  <p className="showcase-meta" role="status">{result}</p>
 </form>;
}

function LeaveDialog({request,t}:{request:LeavePrompt;t:Translate}){
 const stay=useRef<HTMLButtonElement>(null),busy=request.phase==='saving'||request.phase==='awaitingAcknowledgement';
 return <Dialog title={t('Rời trang khi còn thay đổi?','Leave with unsaved changes?')} description={t('Ghi chú hồ sơ của Nguyễn An chưa được lưu.','The profile note for Nguyễn An is not saved.')} value onValueChange={open=>{if(!open)request.choose('stay');}} initialFocusRef={stay}>
  {request.errorMessage&&<p role="alert">{request.errorMessage}</p>}
  <div className="showcase-dialog-actions showcase-dialog-actions--split">
   <Button variant="ghost" className="showcase-danger-text" disabled={busy} onClick={()=>request.choose('discard')}>{t('Bỏ thay đổi','Discard changes')}</Button>
   <span className="showcase-dialog-actions__end"><Button ref={stay} variant="secondary" onClick={()=>request.choose('stay')}>{t('Ở lại','Stay')}</Button><Button disabled={busy||!request.canSaveAll} loading={request.phase==='saving'} onClick={()=>request.choose('save')}>{t('Lưu và rời đi','Save and leave')}</Button></span>
  </div>
 </Dialog>;
}
function Draft({t}:{t:Translate}){
 const [text,setText]=useState('Đã nhận thẻ ra vào, chờ cấp laptop.'),[saved,setSaved]=useState(text),[revision,setRevision]=useState(1),[result,setResult]=useState<'leave'|'stay'|null>(null),leave=useConfirmLeave();
 useUnsavedChanges({id:'profile-note',scopeKey:'profile',revision,dirty:text!==saved,save:async()=>{setSaved(text);setRevision(value=>value+1);},discard:()=>setText(saved)});
 return <div className="showcase-stack">
  <Input label={t('Ghi chú hồ sơ','Profile note')} value={text} onValueChange={value=>{setText(value);setResult(null);}} description={text!==saved?t('Có thay đổi chưa lưu.','Unsaved changes.'):t('Đã lưu.','Saved.')}/>
  <div className="showcase-toolbar"><Button variant="secondary" onClick={()=>{void leave('profile').then(value=>setResult(value==='leave'?'leave':'stay'));}}>{t('Rời trang','Leave page')}</Button></div>
  <p className="showcase-meta" role="status">{result==='leave'?t('Có thể rời trang: không còn thay đổi chưa lưu.','You can leave: nothing is left unsaved.'):result==='stay'?t('Bạn ở lại để tiếp tục chỉnh sửa.','You stayed to keep editing.'):''}</p>
 </div>;
}
