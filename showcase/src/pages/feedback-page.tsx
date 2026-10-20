import {useState} from 'react';
import {useToast} from '@sdcorejs/nova/toast';
import {useConfirm} from '@sdcorejs/nova/confirm';
import {Alert} from '@sdcorejs/nova/alert';
import {Button} from '@sdcorejs/nova/button';
import {Badge} from '@sdcorejs/nova/badge';
import {DataState,Empty,Progress,Spinner} from '@sdcorejs/nova/data-state';
import {SegmentedControl} from '@sdcorejs/nova/segmented-control';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,TechDetails,translator} from '../ui.js';

type Result={vi:string;en:string;event:string};
type View='loading'|'ready'|'empty'|'error';
export function FeedbackPage({locale}:{locale:Locale}){
 const t=translator(locale),toast=useToast(),confirm=useConfirm();
 const [result,setResult]=useState<Result|null>(null),[view,setView]=useState<View>('ready'),[attempts,setAttempts]=useState(0);
 const lock=async()=>{
  const answer=await confirm({title:t('Khóa tài khoản của Nguyễn Thị Phương Thảo?','Lock the account of Nguyễn Thị Phương Thảo?'),description:t('Nhân viên bị đăng xuất khỏi mọi thiết bị cho tới khi được mở khóa.','They are signed out of every device until the account is unlocked.'),confirmLabel:t('Khóa tài khoản','Lock account'),cancelLabel:t('Giữ nguyên','Keep active'),tone:'danger'});
  setResult(answer==='confirmed'?{vi:'Đã khóa tài khoản.',en:'The account is locked.',event:'confirmed'}:{vi:'Đã hủy, tài khoản vẫn hoạt động.',en:'Cancelled; the account stays active.',event:'cancelled'});
 };
 return <>
  <PageHead eyebrow={labels[locale].feedback} title={t('Thông báo và trạng thái','Notifications and status')} intro={t('Alert, Toast, Confirm, trạng thái dữ liệu và Badge trong một trung tâm thông báo nhân sự.','Alerts, toasts, confirmations, data states and badges in an HR notification centre.')}/>
  <Alert tone="tip" title={t('Thử trực tiếp','Try it here')}>{t('Mỗi nút bên dưới gọi đúng API (useToast, useConfirm) với nội dung thật. Không có dữ liệu nào rời khỏi trang.','Each button calls the real API (useToast, useConfirm) with realistic content. No data leaves this page.')}</Alert>
  <div className="showcase-cols">
   <DemoCard title={t('Thông báo tạm thời','Temporary notifications')} meta={t('Toast tự đóng; thao tác nguy hiểm luôn hỏi lại.','Toasts close on their own; dangerous actions always ask first.')}
    footer={<p className="showcase-meta" role="status">{result?t(result.vi,result.en):t('Chưa có thao tác nào.','No action yet.')}</p>}>
    <div className="showcase-toolbar">
     <Button variant="secondary" onClick={()=>{toast.show({tone:'success',title:t('Đã lưu hồ sơ','Profile saved'),description:'Nguyễn Thị Phương Thảo · NV-10240'});setResult({vi:'Đã hiện thông báo lưu thành công.',en:'Showed the saved notification.',event:'toast-success'});}}>{t('Lưu thành công','Save succeeded')}</Button>
     <Button variant="secondary" onClick={()=>{toast.show({tone:'error',title:t('Không gửi được email chào mừng','Welcome email not sent'),description:t('Hộp thư của người nhận đã đầy.','The recipient mailbox is full.'),durationMs:null,action:{label:t('Thử lại','Retry'),onAction:()=>{setAttempts(count=>count+1);setResult({vi:'Đã xếp email vào hàng đợi gửi lại.',en:'The email is queued for another attempt.',event:'toast-retry'});}}});}}>{t('Lỗi có thao tác','Error with action')}</Button>
     <Button variant="danger" onClick={()=>{void lock();}}>{t('Khóa tài khoản…','Lock account…')}</Button>
    </div>
    <TechDetails t={t} topic={t('sự kiện','events')}><code>{JSON.stringify({last:result?.event??null,retries:attempts})}</code></TechDetails>
   </DemoCard>
   <DemoCard title={t('Trạng thái dữ liệu','Data states')} meta={t('Hộp thư thông báo của Nguyễn An','Nguyễn An notification inbox')}>
    <SegmentedControl<View> label={t('Xem trạng thái','Show state')} items={[{value:'loading',label:t('Đang tải','Loading')},{value:'ready',label:t('Có dữ liệu','Data')},{value:'empty',label:t('Trống','Empty')},{value:'error',label:t('Lỗi','Error')}]} value={view} onValueChange={value=>{if(value)setView(value);}}/>
    {view==='loading'?<Spinner label={t('Đang tải thông báo…','Loading notifications…')}/>:null}
    {view==='ready'?<>
     <Progress label={t('Đồng bộ hồ sơ','Profile sync')} value={64}/>
     <ul className="showcase-list">
      <li><span className="showcase-list__icon"><Icon name="feedback"/></span><span className="showcase-list__text"><span>{t('Đơn nghỉ phép 09–11/11 đã được duyệt','Leave 9–11 Nov approved')}</span><span className="showcase-meta">{t('Lê Hoàng Minh Quân · 2 giờ trước','Lê Hoàng Minh Quân · 2 hours ago')}</span></span></li>
      <li><span className="showcase-list__icon"><Icon name="file"/></span><span className="showcase-list__text"><span>{t('Hợp đồng HĐLĐ-2026-0398 chờ ký','Contract HĐLĐ-2026-0398 awaits signature')}</span><span className="showcase-meta">{t('Hôm qua','Yesterday')}</span></span></li>
     </ul>
    </>:null}
    {view==='empty'?<Empty icon={<Icon name="inbox"/>} title={t('Không có thông báo mới','No new notifications')} description={t('Bạn đã xem hết thông báo trong 7 ngày qua.','You have seen every notification from the last 7 days.')}/>:null}
    {view==='error'?<DataState state="error" message={t('Không tải được thông báo. Kiểm tra kết nối rồi thử lại.','Could not load notifications. Check the connection and try again.')} onRetry={()=>setView('ready')}/>:null}
   </DemoCard>
  </div>
  <DemoCard title={t('Trạng thái hồ sơ','Record statuses')} meta={t('Mỗi trạng thái có chữ, không chỉ dựa vào màu.','Every status has text, never colour alone.')}>
   <div className="showcase-toolbar"><Badge tone="success">{t('Đã duyệt','Approved')}</Badge><Badge tone="info">{t('Chờ duyệt','Pending approval')}</Badge><Badge tone="warning">{t('Sắp hết hạn','Expiring soon')}</Badge><Badge tone="error">{t('Bị từ chối','Rejected')}</Badge><Badge>{t('Bản nháp','Draft')}</Badge></div>
  </DemoCard>
 </>;
}
