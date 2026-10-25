import {useRef,useState} from 'react';
import {Badge} from '@sdcorejs/nova/badge';
import {Button} from '@sdcorejs/nova/button';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {DatePicker} from '@sdcorejs/nova/date-picker';
import {Input,Textarea} from '@sdcorejs/nova/input';
import {MultiSelect} from '@sdcorejs/nova/multi-select';
import {NumberInput} from '@sdcorejs/nova/number-input';
import {SegmentedControl} from '@sdcorejs/nova/segmented-control';
import {Select} from '@sdcorejs/nova/select';
import {Switch} from '@sdcorejs/nova/switch';
import {useToast} from '@sdcorejs/nova/toast';
import {useFormatter} from '@sdcorejs/nova/formatter';
import {DataTable,type Column,type TableState} from '@sdcorejs/nova/data-table';
import type {MenuAction} from '@sdcorejs/nova/types';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';
import {STATUS_ORDER,employees,statusText,type Employee} from './employees.js';

/**
 * "Hồ sơ nhân sự": the theme Nova v2 reference screen. A mixed form (32px controls,
 * 13/18 500 labels, 6px label/control/helper rhythm) above the 248-record table
 * (36 header, 40 rows or 32 dense, 28px pagination). Every state is reachable from the page.
 */
export function ProfilePage({locale}:{locale:Locale}){
 const t=translator(locale);
 return <>
  <PageHead eyebrow={labels[locale].profile} title={t('Hồ sơ nhân sự','Employee records')} intro={t('Màn hình mẫu của theme Nova v2: biểu mẫu thêm nhân sự và danh sách 248 hồ sơ. Thử giao diện tối và chiều rộng 375px.','The theme Nova v2 reference screen: a new-employee form and the 248-record list. Try the dark theme and a 375px width.')}/>
  <NewEmployeeForm t={t} locale={locale}/>
  <EmployeeRecords t={t} locale={locale}/>
 </>;
}

type Contract='official'|'probation'|'freelance';
const DEPARTMENT_OPTIONS=['Khối Công nghệ thông tin và Chuyển đổi số','Phòng Nhân sự và Phát triển tổ chức','Phòng Tài chính – Kế toán','Ban Pháp chế và Tuân thủ','Trung tâm Chăm sóc khách hàng doanh nghiệp miền Trung'];
const SKILLS=['Phân tích nghiệp vụ','Quản lý dự án','SQL','Power BI','Tiếng Anh giao tiếp','Đào tạo nội bộ'];
const INITIAL={name:'Hoàng Gia Bảo',email:'bao.hg@congty',department:DEPARTMENT_OPTIONS[0] as string|null,title:'Chuyên viên phân tích nghiệp vụ cấp cao',start:'2026-11-01' as string|null,salary:18_500_000 as number|null,contract:'probation' as Contract|null,skills:['Phân tích nghiệp vụ','SQL'] as readonly string[],note:'',sendAccount:true,signed:false};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function NewEmployeeForm({t,locale}:{t:Translate;locale:Locale}){
 const toast=useToast(),format=useFormatter(),name=useRef<HTMLInputElement>(null),email=useRef<HTMLInputElement>(null);
 const [values,setValues]=useState(INITIAL),[attempted,setAttempted]=useState(false),[saving,setSaving]=useState(false),[savedAt,setSavedAt]=useState<string|null>(null);
 function update<K extends keyof typeof INITIAL>(key:K,value:(typeof INITIAL)[K]){setValues(v=>({...v,[key]:value}));setSavedAt(null);}
 const nameError=attempted&&!values.name.trim()?t('Nhập họ và tên.','Enter the full name.'):undefined;
 const emailError=attempted&&!EMAIL.test(values.email)?t('Email không đúng định dạng.','The email address is not valid.'):undefined;
 const departments=DEPARTMENT_OPTIONS.map(label=>({key:label,label,data:label}));
 const skills=SKILLS.map(label=>({key:label,label,data:label}));
 function submit(event:{preventDefault:()=>void}){
  event.preventDefault();setAttempted(true);
  if(!values.name.trim()){name.current?.focus();return;}
  if(!EMAIL.test(values.email)){email.current?.focus();return;}
  setSaving(true);
  window.setTimeout(()=>{setSaving(false);setSavedAt(new Date().toLocaleTimeString(locale==='vi'?'vi-VN':'en-GB',{hour:'2-digit',minute:'2-digit'}));toast.show({tone:'success',title:t('Đã lưu hồ sơ','Record saved'),description:t('Bản mẫu chỉ giữ hồ sơ trong trang đang mở.','This preview keeps the record in the open page only.')});},800);
 }
 const status=saving?t('Đang lưu…','Saving…'):savedAt?t('Đã lưu lúc ','Saved at ')+savedAt+'.':t('Tài khoản đăng nhập sẽ được gửi vào email công ty.','Sign-in details go to the company email.');
 return <form noValidate onSubmit={submit}>
  <DemoCard title={t('Thêm nhân sự','New employee')} meta={t('Nhập thông tin cơ bản. Các trường có dấu * là bắt buộc.','Enter the basics. Fields marked * are required.')} actions={<Badge tone="info">{t('Thử việc','Probation')}</Badge>}
   footer={<><p className="showcase-meta" role="status">{status}</p><div className="showcase-toolbar"><Button variant="ghost" disabled={saving} onClick={()=>{setValues(INITIAL);setAttempted(false);setSavedAt(null);}}>{t('Hủy','Cancel')}</Button><Button variant="secondary" disabled={saving} onClick={()=>toast.show({tone:'info',title:t('Đã lưu nháp','Draft saved')})}>{t('Lưu nháp','Save draft')}</Button><Button type="submit" variant="primary" loading={saving}>{t('Lưu hồ sơ','Save record')}</Button></div></>}>
   <div className="showcase-field-grid">
    <Input ref={name} name="fullName" autoComplete="name" required label={t('Họ và tên','Full name')} description={t('Theo căn cước công dân.','As on the citizen ID.')} error={nameError} value={values.name} onValueChange={value=>update('name',value)}/>
    <Input ref={email} type="email" name="workEmail" autoComplete="email" required label={t('Email công ty','Company email')} error={emailError} description={emailError?undefined:t('Dùng để đăng nhập.','Used to sign in.')} value={values.email} onValueChange={value=>update('email',value)}/>
    <Select<string,string> name="department" clearable label={t('Phòng ban','Department')} description={t('Theo sơ đồ tổ chức.','As on the org chart.')} options={departments} value={values.department} onValueChange={value=>update('department',value)}/>
    <Input name="jobTitle" label={t('Chức danh','Job title')} description={t('Hiển thị trong chữ ký email.','Shown in the email signature.')} value={values.title} onValueChange={value=>update('title',value)}/>
    <DatePicker name="startDate" label={t('Ngày vào làm','Start date')} referenceDate="2026-10-25" description={t('Tự điền theo hợp đồng.','Filled from the contract.')} value={values.start} onValueChange={value=>update('start',value)}/>
    <NumberInput name="salary" min={0} step={500_000} label={t('Lương cơ bản (₫)','Base salary (₫)')} description={values.salary===null?t('Chưa nhập.','Not entered.'):format.number(values.salary)+' ₫'} value={values.salary} onValueChange={value=>update('salary',value)}/>
    <SegmentedControl<Contract> stretch label={t('Loại hợp đồng','Contract')} description={t('Thử việc tối đa 60 ngày.','Probation lasts up to 60 days.')} items={[{value:'official',label:t('Chính thức','Permanent')},{value:'probation',label:t('Thử việc','Probation')},{value:'freelance',label:t('Cộng tác','Freelance')}]} value={values.contract} onValueChange={value=>update('contract',value)}/>
    <MultiSelect<string,string> name="skills" label={t('Kỹ năng','Skills')} description={t('Dùng để gợi ý khóa đào tạo.','Used to suggest training.')} options={skills} value={values.skills} onValueChange={value=>update('skills',value)}/>
    <Input name="employeeId" readOnly label={t('Mã nhân viên','Employee ID')} description={t('Tự sinh khi lưu.','Generated on save.')} value="NV-10249" onValueChange={()=>undefined}/>
   </div>
   <Textarea name="note" rows={3} label={t('Ghi chú cho quản lý trực tiếp','Note for the line manager')} description={t('Không bắt buộc. Hiển thị trong email chào mừng.','Optional. Shown in the welcome email.')} value={values.note} onValueChange={value=>update('note',value)}/>
   <div className="showcase-choice-row">
    <Switch label={t('Gửi tài khoản đăng nhập qua email','Email the sign-in details')} value={values.sendAccount} onValueChange={value=>update('sendAccount',value)}/>
    <Checkbox label={t('Đã ký hợp đồng lao động','Employment contract signed')} value={values.signed} onValueChange={value=>update('signed',value===true)}/>
   </div>
  </DemoCard>
 </form>;
}

type Simulation='ready'|'initial'|'refreshing'|'error'|'empty';
type Density='regular'|'dense';
const statusLabel=(t:Translate,status:Employee['status'])=>t(statusText[status].vi,statusText[status].en);

function EmployeeRecords({t,locale}:{t:Translate;locale:Locale}){
 const format=useFormatter();
 const [state,setState]=useState<TableState<string>>({page:{pageIndex:0,pageSize:20},sort:[{columnId:'startDate',direction:'desc'}],selectedKeys:[]});
 const [simulation,setSimulation]=useState<Simulation>('ready'),[density,setDensity]=useState<Density>('regular'),[notice,setNotice]=useState<string|null>(null);
 const collator=new Intl.Collator(locale==='vi'?'vi':'en',{sensitivity:'base'});
 const all=employees();
 const sorted=[...all].sort((a,b)=>{for(const item of state.sort){const result=item.columnId==='name'?collator.compare(a.givenName,b.givenName)||collator.compare(a.name,b.name):item.columnId==='department'?collator.compare(a.department,b.department):item.columnId==='startDate'?a.startDate.localeCompare(b.startDate):item.columnId==='salary'?a.salary-b.salary:item.columnId==='status'?STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status):0;if(result)return item.direction==='asc'?result:-result;}return a.id.localeCompare(b.id);});
 const start=state.page.pageIndex*state.page.pageSize,page=sorted.slice(start,start+state.page.pageSize);
 const empty=simulation==='empty'||simulation==='initial'||simulation==='error';
 const columns:readonly Column<Employee>[]=[
  {id:'id',header:t('Mã NV','ID'),cell:row=><span className="showcase-num">{row.id}</span>},
  {id:'name',header:t('Họ và tên','Full name'),sortKey:'name',cell:row=><span className="showcase-person__name">{row.name}</span>},
  {id:'department',header:t('Phòng ban','Department'),sortKey:'department',cell:row=>row.department},
  {id:'title',header:t('Chức danh','Job title'),cell:row=>row.title},
  {id:'startDate',header:t('Ngày vào làm','Start date'),sortKey:'startDate',cell:row=><span className="showcase-num">{format.date(row.startDate)}</span>},
  {id:'salary',header:t('Lương (₫)','Salary (₫)'),sortKey:'salary',cell:row=><span className="showcase-num showcase-cell-end">{format.number(row.salary)}</span>},
  {id:'status',header:t('Trạng thái','Status'),sortKey:'status',cell:row=><Badge tone={statusText[row.status].tone}>{statusLabel(t,row.status)}</Badge>},
 ];
 const rowActions:readonly MenuAction<Employee>[]=[
  {id:'view',label:t('Xem hồ sơ','View record'),onAction:row=>setNotice(t('Đã mở hồ sơ ','Opened the record of ')+row.name+'.')},
  {id:'edit',label:t('Sửa hồ sơ','Edit record'),onAction:row=>setNotice(t('Đang sửa hồ sơ ','Editing the record of ')+row.name+'.')},
 ];
 const selected=state.selectedKeys.length;
 return <DemoCard className="showcase-card--table" data-testid="profile-records" title={t('Danh sách nhân sự','Employee list')} meta={t(all.length+' hồ sơ · cập nhật 25/10/2026 09:12',all.length+' records · updated 25/10/2026 09:12')}
  footer={<><p className="showcase-meta" role="status">{notice??(selected?t('Đã chọn '+selected+' hồ sơ.',selected+' records selected.'):t('Chưa chọn hồ sơ nào.','No records selected.'))}</p>{selected?<Button variant="ghost" onClick={()=>{setState(current=>({...current,selectedKeys:[]}));setNotice(null);}}>{t('Bỏ chọn','Clear selection')}</Button>:null}</>}>
  <div className="showcase-filter-bar">
   <SegmentedControl<Density> label={t('Mật độ','Density')} items={[{value:'regular',label:t('Thường · 40','Regular · 40')},{value:'dense',label:t('Dày · 32','Dense · 32')}]} value={density} onValueChange={value=>{if(value)setDensity(value);}}/>
   <SegmentedControl<Simulation> label={t('Mô phỏng dữ liệu','Simulated data')} items={[{value:'ready',label:t('Có dữ liệu','Loaded')},{value:'initial',label:t('Tải lần đầu','First load')},{value:'refreshing',label:t('Đang cập nhật','Refreshing')},{value:'error',label:t('Lỗi','Error')},{value:'empty',label:t('Trống','Empty')}]} value={simulation} onValueChange={value=>{if(value)setSimulation(value);}}/>
  </div>
  <DataTable className={density==='dense'?'showcase-employee-table nova-data-table--dense':'showcase-employee-table'} caption={t('Danh sách nhân sự','Employee list')} rows={empty?[]:page} getRowKey={row=>row.id} columns={columns} state={state} onStateChange={setState}
   total={simulation==='ready'||simulation==='refreshing'?sorted.length:simulation==='empty'?0:undefined} pageSizeOptions={[10,20,50]} showFirstLast isRowSelectable={row=>row.status!=='former'} rowActions={rowActions}
   loading={simulation==='initial'||simulation==='refreshing'} errorMessage={simulation==='error'?t('Không tải được danh sách nhân sự. Kiểm tra kết nối rồi thử lại.','The employee list could not be loaded. Check the connection and try again.'):undefined} onRetry={()=>setSimulation('ready')}
   renderMobileRow={row=><div className="showcase-mobile-row"><span className="showcase-person"><span className="showcase-person__name">{row.name}</span><span className="showcase-meta">{row.id} · {format.date(row.startDate)}</span></span><span>{row.department} · {row.title}</span><span className="showcase-mobile-row__meta"><Badge tone={statusText[row.status].tone}>{statusLabel(t,row.status)}</Badge><span className="showcase-num">{format.number(row.salary)} ₫</span></span></div>}/>
  <TechDetails t={t} topic={t('trạng thái bảng','table state')}>
   <TechRow label="Simulation"><output aria-label="Simulation">{simulation}</output></TechRow>
   <TechRow label="Density"><output aria-label="Density">{density}</output></TechRow>
   <TechRow label="Page"><output aria-label="Page">{JSON.stringify(state.page)}</output></TechRow>
   <TechRow label="Sort"><output aria-label="Sort">{JSON.stringify(state.sort)}</output></TechRow>
  </TechDetails>
 </DemoCard>;
}
