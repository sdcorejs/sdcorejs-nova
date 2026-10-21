import {useState} from 'react';
import {ActionMenu,QuickActions} from '@sdcorejs/nova/action-menu';
import {InlineEdit} from '@sdcorejs/nova/inline-edit';
import {Input} from '@sdcorejs/nova/input';
import {Avatar} from '@sdcorejs/nova/avatar';
import {Button} from '@sdcorejs/nova/button';
import {useConfirm} from '@sdcorejs/nova/confirm';
import type {MenuAction} from '@sdcorejs/nova/types';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,InfoRow,PageHead,TechDetails,translator} from '../ui.js';

type Employee={id:string;fullName:string};
/** Messages keep both languages so a later language switch re-renders them. */
type LastAction={action:string;data:{id:string};at:string;vi:string;en:string};
const EMPLOYEE:Employee={id:'NV-10240',fullName:'Nguyễn Thị Phương Thảo'};
export function ActionsPage({locale}:{locale:Locale}){
 const t=translator(locale),confirm=useConfirm();
 const [name,setName]=useState('Phương Thảo'),[revision,setRevision]=useState(1);
 const [last,setLast]=useState<LastAction>({action:'resend-welcome',data:{id:EMPLOYEE.id},at:'2026-10-20T10:05:12+07:00',vi:'Đã gửi lại email chào mừng lúc 10:05.',en:'Welcome email resent at 10:05.'});
 const record=(action:string,vi:string,en:string)=>setLast({action,data:{id:EMPLOYEE.id},at:new Date().toISOString(),vi,en});
 const actions:readonly MenuAction<Employee>[]=[
  {id:'view',label:t('Xem hồ sơ đầy đủ','Open full profile'),onAction:row=>record('view','Đã mở hồ sơ của '+row.fullName+'.','Opened the profile of '+row.fullName+'.')},
  {id:'resend-welcome',label:t('Gửi lại email chào mừng','Resend welcome email'),onAction:row=>record('resend-welcome','Đã gửi lại email chào mừng cho '+row.fullName+'.','Welcome email resent to '+row.fullName+'.')},
  {id:'transfer',label:t('Chuyển phòng ban','Move to department'),children:[
   {id:'transfer-product',label:t('Sản phẩm','Product'),onAction:row=>record('transfer-product',row.fullName+' sẽ chuyển sang phòng Sản phẩm từ 01/11.',row.fullName+' moves to Product on 1 Nov.')},
   {id:'transfer-data',label:t('Dữ liệu','Data'),onAction:row=>record('transfer-data',row.fullName+' sẽ chuyển sang phòng Dữ liệu từ 01/11.',row.fullName+' moves to Data on 1 Nov.')},
  ]},
  {id:'lock',label:t('Khóa tài khoản…','Lock account…'),onAction:async row=>{
   const result=await confirm({title:t('Khóa tài khoản của ','Lock the account of ')+row.fullName+'?',description:t('Nhân viên bị đăng xuất khỏi mọi thiết bị cho tới khi được mở khóa.','They are signed out of every device until the account is unlocked.'),confirmLabel:t('Khóa tài khoản','Lock account'),cancelLabel:t('Giữ nguyên','Keep active'),tone:'danger'});
   if(result==='confirmed')record('lock','Đã khóa tài khoản của '+row.fullName+'.','Locked the account of '+row.fullName+'.');else record('lock-cancelled','Tài khoản vẫn hoạt động.','The account stays active.');
  }},
 ];
 const quick:readonly MenuAction<Employee>[]=actions.slice(0,2);
 const exportActions:readonly MenuAction<string>[]=[{id:'xlsx',label:'Excel (.xlsx)',onAction:()=>record('export-xlsx','Đã chuẩn bị tệp Excel (bản mẫu, không tạo tệp).','Excel file prepared (preview, no file created).')},{id:'csv',label:'CSV',onAction:()=>record('export-csv','Đã chuẩn bị tệp CSV (bản mẫu, không tạo tệp).','CSV file prepared (preview, no file created).')}];
 const contractActions:readonly MenuAction<string>[]=[{id:'open',label:t('Mở hợp đồng','Open contract'),onAction:code=>record('contract-open','Đã mở '+code+'.','Opened '+code+'.')},{id:'renew',label:t('Gia hạn 12 tháng','Renew for 12 months'),onAction:code=>record('contract-renew','Đã gửi '+code+' đi gia hạn.',code+' sent for renewal.')}];
 return <>
  <PageHead eyebrow={labels[locale].actions} title={t('Thao tác trên hồ sơ','Profile actions')} intro={t('Menu thao tác, thao tác nhanh và sửa tại chỗ trên một hồ sơ nhân viên.','An action menu, quick actions and in-place editing on one employee profile.')}/>
  <DemoCard title={EMPLOYEE.fullName} meta={EMPLOYEE.id+' · '+t('Kỹ sư phần mềm cấp cao','Senior software engineer')} lead={<Avatar name={EMPLOYEE.fullName} decorative/>}
   actions={<ActionMenu label={t('Thao tác','Actions')} data={EMPLOYEE} actions={actions}/>}>
   <div className="showcase-info-list">
    <InfoRow label={t('Tên hiển thị','Display name')}><InlineEdit value={name} revision={revision} scopeKey="profile" display={name} label={t('tên hiển thị','display name')} renderEditor={({draft,setDraft})=><Input label={t('Tên hiển thị','Display name')} value={draft} onValueChange={setDraft}/>} onSave={async draft=>({value:draft.trim()||name,revision:revision+1})} onCommit={commit=>{setName(commit.value);setRevision(Number(commit.revision));record('rename','Đã đổi tên hiển thị thành '+commit.value+'.','Display name changed to '+commit.value+'.');}}/></InfoRow>
    <InfoRow label={t('Phòng ban','Department')}>{t('Kỹ thuật · Nền tảng thanh toán','Engineering · Payments platform')}</InfoRow>
    <InfoRow label={t('Quản lý trực tiếp','Manager')}>Lê Hoàng Minh Quân</InfoRow>
    <InfoRow label={t('Kết quả gần nhất','Latest result')}><span role="status" className="showcase-status-line"><Icon name="check"/><span>{t(last.vi,last.en)}</span></span></InfoRow>
   </div>
   <TechDetails t={t} topic={t('sự kiện','event')}><code>{JSON.stringify({lastAction:last.action,data:last.data,at:last.at})}</code></TechDetails>
  </DemoCard>
  <div className="showcase-cols">
   <DemoCard title={t('ActionMenu hay QuickActions?','ActionMenu or QuickActions?')}>
    <p className="showcase-muted">{t('ActionMenu chứa các thao tác chính của trang. QuickActions (cùng component) đặt cạnh từng đối tượng trong hàng, thẻ hoặc cây; nhãn nêu tên đối tượng để mỗi nút có tên riêng.','ActionMenu holds the main actions of a page. QuickActions (the same component) sits next to each object in rows, cards or trees; its label names the object so every button has a distinct name.')}</p>
    <div className="showcase-toolbar"><ActionMenu label={t('Xuất dữ liệu','Export')} data="employees" actions={exportActions}/><QuickActions label={t('Thao tác cho HĐLĐ-2026-0412','Actions for HĐLĐ-2026-0412')} data="HĐLĐ-2026-0412" actions={contractActions}/><QuickActions label={t('Thao tác nhanh cho Phương Thảo','Quick actions for Phương Thảo')} data={EMPLOYEE} actions={quick}/></div>
   </DemoCard>
   <DemoCard title={t('Thứ bậc nút','Button hierarchy')} meta={t('Đánh giá thử việc của Phương Thảo','Probation review for Phương Thảo')}>
    <div className="showcase-toolbar"><Button variant="ghost" onClick={()=>record('discard-draft','Đã bỏ bản nháp đánh giá.','Review draft discarded.')}>{t('Hủy','Cancel')}</Button><Button variant="secondary" onClick={()=>record('save-draft','Đã lưu nháp đánh giá.','Review draft saved.')}>{t('Lưu nháp','Save draft')}</Button><Button onClick={()=>record('submit-review','Đã gửi đánh giá cho quản lý duyệt.','Review sent to the manager for approval.')}>{t('Gửi duyệt','Submit for approval')}</Button></div>
    <p className="showcase-meta">{t('Một nút chính cho mỗi vùng; thao tác phá hủy dùng nút nguy hiểm và cần xác nhận.','One primary button per region; destructive actions use the danger style and ask for confirmation.')}</p>
   </DemoCard>
  </div>
 </>;
}
