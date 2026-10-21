import {useId,useRef,useState,type RefObject} from 'react';
import {Dialog,Sheet,Drawer} from '@sdcorejs/nova/dialog';
import {Popover,Tooltip} from '@sdcorejs/nova/popover';
import {Button,IconButton} from '@sdcorejs/nova/button';
import {Select} from '@sdcorejs/nova/select';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {NumberInput} from '@sdcorejs/nova/number-input';
import {DatePicker} from '@sdcorejs/nova/date-picker';
import {Badge} from '@sdcorejs/nova/badge';
import {useToast} from '@sdcorejs/nova/toast';
import {useFormatter} from '@sdcorejs/nova/formatter';
import {ResizableDialog,type DialogSize} from '@sdcorejs/nova/resizable-dialog';
import {Splitter} from '@sdcorejs/nova/splitter';
import {useMediaQuery} from '@sdcorejs/nova/viewport';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,TechDetails,translator,type Translate} from '../ui.js';

type ContractType='indefinite'|'fixed-12'|'probation';
type Contract={code:string;employee:string;type:ContractType;start:string;salary:number;status:'signed'|'draft'};
const INITIAL:readonly Contract[]=[
 {code:'HĐLĐ-2026-0412',employee:'Nguyễn Thị Phương Thảo',type:'indefinite',start:'2026-11-03',salary:42_000_000,status:'signed'},
 {code:'HĐLĐ-2026-0398',employee:'Trần Minh Khang',type:'fixed-12',start:'2026-11-03',salary:28_500_000,status:'signed'},
 {code:'HĐLĐ-2026-0371',employee:'Công Tằng Tôn Nữ Diệu Hương',type:'probation',start:'2026-10-15',salary:19_000_000,status:'draft'},
];
const PEOPLE=['Lê Võ Minh Khôi','Huỳnh Ngọc Bảo Trâm','Đỗ Quang Vinh'];
const typeLabel=(t:Translate,type:ContractType)=>type==='indefinite'?t('Không xác định thời hạn','Permanent'):type==='fixed-12'?t('Xác định thời hạn 12 tháng','Fixed term, 12 months'):t('Thử việc 2 tháng','Probation, 2 months');
export function OverlaysPage({locale}:{locale:Locale}){
 const t=translator(locale),toast=useToast(),format=useFormatter(),stacked=useMediaQuery('(max-width: 640px)');
 const [contracts,setContracts]=useState(INITIAL),[selected,setSelected]=useState(INITIAL[0]!.code),[open,setOpen]=useState<'create'|'filter'|'history'|null>(null);
 const [types,setTypes]=useState<readonly ContractType[]>(['indefinite','fixed-12','probation']),[draftTypes,setDraftTypes]=useState<readonly ContractType[]>(types);
 const [session,setSession]=useState(0),[sizes,setSizes]=useState<readonly number[]>([40,60]),[full,setFull]=useState(false),[size,setSize]=useState<DialogSize>({width:640,height:480});
 const createOpener=useRef<HTMLButtonElement>(null),filterOpener=useRef<HTMLButtonElement>(null),historyOpener=useRef<HTMLButtonElement>(null),fullOpener=useRef<HTMLButtonElement>(null);
 const visible=contracts.filter(item=>types.includes(item.type)),current=contracts.find(item=>item.code===selected)??contracts[0]!;
 const money=(value:number)=>format.number(value,{style:'currency',currency:'VND',maximumFractionDigits:0});
 const close=(value:boolean)=>{if(!value)setOpen(null);};
 return <>
  <PageHead eyebrow={labels[locale].overlays} title={t('Quản lý hợp đồng','Contract management')} intro={t('Chọn Dialog, Sheet, Drawer, Popover hay Tooltip theo mục đích, không theo thói quen.','Pick a dialog, sheet, drawer, popover or tooltip for its purpose, not out of habit.')}/>
  <DemoCard title={t('Hợp đồng lao động','Employment contracts')} meta={t(visible.length+' / '+contracts.length+' hợp đồng đang hiển thị',visible.length+' of '+contracts.length+' contracts shown')}
   actions={<><Button ref={historyOpener} variant="ghost" onClick={()=>setOpen('history')}><Icon name="history"/>{t('Lịch sử','History')}</Button><Button ref={filterOpener} variant="secondary" onClick={()=>{setDraftTypes(types);setOpen('filter');}}><Icon name="filter"/>{t('Bộ lọc','Filters')}</Button><Button ref={createOpener} onClick={()=>{setSession(value=>value+1);setOpen('create');}}><Icon name="plus"/>{t('Tạo hợp đồng','New contract')}</Button></>}>
   <Splitter data-testid="split-demo" className="showcase-split" orientation={stacked?'vertical':'horizontal'} value={sizes} onValueChange={setSizes} minSizes={[30,35]}>
    <div className="showcase-split__pane">
     <ul className="showcase-contract-list" aria-label={t('Danh sách hợp đồng','Contract list')}>{visible.map(item=><li key={item.code}><button type="button" className="showcase-contract" aria-current={item.code===current.code?'true':undefined} onClick={()=>setSelected(item.code)}><span className="showcase-contract__code">{item.code}</span><span className="showcase-meta">{item.employee}</span></button></li>)}</ul>
     {visible.length===0?<p className="showcase-muted">{t('Không có hợp đồng khớp bộ lọc.','No contracts match the filters.')}</p>:null}
    </div>
    <div className="showcase-split__pane showcase-split__detail">
     <div className="showcase-detail-head"><h3>{current.code}</h3><Badge tone={current.status==='signed'?'success':'neutral'}>{current.status==='signed'?t('Đã ký','Signed'):t('Bản nháp','Draft')}</Badge></div>
     <p>{current.employee}</p>
     <p className="showcase-muted">{typeLabel(t,current.type)} · {t('hiệu lực từ ','effective ')}{format.date(current.start)} · {money(current.salary)}</p>
     <div className="showcase-toolbar">
      <Popover label={t('Điều khoản chính','Key terms')} trigger={<Button variant="secondary" size="sm"><Icon name="info"/>{t('Điều khoản','Terms')}</Button>}><p>{t('Thử việc 2 tháng, hưởng 85% lương. Báo trước 30 ngày khi chấm dứt hợp đồng.','Two months of probation at 85% pay. 30 days of notice to terminate.')}</p></Popover>
      <Button ref={fullOpener} variant="secondary" size="sm" onClick={()=>setFull(true)}>{t('Xem toàn văn','View full text')}</Button>
      <Tooltip content={t('Tải hợp đồng PDF','Download contract PDF')}><IconButton variant="ghost" size="sm" label={t('Tải hợp đồng PDF','Download contract PDF')} icon={<Icon name="download"/>} onClick={()=>toast.show({tone:'info',title:t('Bản mẫu không có tệp PDF thật','No real PDF in this preview'),description:current.code})}/></Tooltip>
     </div>
    </div>
   </Splitter>
   <ul className="showcase-notes">
    <li>{t('Tạo hợp đồng → Dialog: biểu mẫu ngắn, cần tập trung.','New contract → Dialog: a short form that needs focus.')}</li>
    <li>{t('Bộ lọc → Sheet bên phải: giữ ngữ cảnh danh sách.','Filters → Sheet on the end side: keeps the list in view.')}</li>
    <li>{t('Lịch sử → Drawer bên trái: chỉ đọc, không chặn công việc dài.','History → Drawer on the start side: read-only, does not block long work.')}</li>
    <li>{t('Điều khoản → Popover; Tooltip chỉ dùng cho nhãn nút biểu tượng.','Terms → Popover; tooltips only label icon buttons.')}</li>
   </ul>
   <TechDetails t={t} topic={t('trạng thái','state')}><code>{JSON.stringify({selected:current.code,types,sizes,dialogSize:size})}</code></TechDetails>
  </DemoCard>
  <CreateContract key={session} open={open==='create'} t={t} onClose={()=>setOpen(null)} returnFocusRef={createOpener} nextCode={'HĐLĐ-2026-0'+(413+contracts.length-INITIAL.length)} onCreate={contract=>{setContracts(list=>[contract,...list]);setTypes(list=>list.includes(contract.type)?list:[...list,contract.type]);setSelected(contract.code);setOpen(null);toast.show({tone:'success',title:t('Đã tạo hợp đồng nháp','Draft contract created'),description:contract.code+' · '+contract.employee});}}/>
  <Sheet side="end" title={t('Bộ lọc hợp đồng','Contract filters')} description={t('Chọn loại hợp đồng cần hiển thị.','Choose which contract types to show.')} value={open==='filter'} onValueChange={close} returnFocusRef={filterOpener}
   footer={<><Button variant="ghost" onClick={()=>setDraftTypes(['indefinite','fixed-12','probation'])}>{t('Đặt lại','Reset')}</Button><Button onClick={()=>{setTypes(draftTypes);setOpen(null);}}>{t('Áp dụng','Apply')}</Button></>}>
   <div className="showcase-stack">
    {(['indefinite','fixed-12','probation'] as const).map(type=><Checkbox key={type} label={typeLabel(t,type)} value={draftTypes.includes(type)} onValueChange={value=>setDraftTypes(list=>value===true?[...list.filter(item=>item!==type),type]:list.filter(item=>item!==type))}/>)}
   </div>
  </Sheet>
  <Drawer side="start" title={t('Lịch sử thay đổi','Change history')} description={current.code} value={open==='history'} onValueChange={close} returnFocusRef={historyOpener} footer={<Button variant="secondary" onClick={()=>setOpen(null)}>{t('Đóng','Close')}</Button>}>
   <ol className="showcase-timeline">
    <li><span className="showcase-meta">20/10/2026 · 09:42</span><span>{t('Phạm Thị Thu Hà cập nhật mức lương.','Phạm Thị Thu Hà updated the salary.')}</span></li>
    <li><span className="showcase-meta">18/10/2026 · 15:10</span><span>{t('Nguyễn An gửi hợp đồng cho nhân viên ký.','Nguyễn An sent the contract for signature.')}</span></li>
    <li><span className="showcase-meta">17/10/2026 · 11:03</span><span>{t('Nguyễn An tạo bản nháp.','Nguyễn An created the draft.')}</span></li>
   </ol>
  </Drawer>
  <ResizableDialog title={t('Toàn văn ','Full text ')+current.code} description={t('Kéo tay cầm hoặc dùng phím mũi tên để đổi kích thước.','Drag the handle or use the arrow keys to resize.')} value={full} onValueChange={setFull} size={size} onSizeChange={setSize} returnFocusRef={fullOpener} footer={<Button variant="secondary" onClick={()=>setFull(false)}>{t('Đóng','Close')}</Button>}>
   <h3>{t('Điều 1. Thời hạn và công việc','Article 1. Term and duties')}</h3>
   <p>{t('Người lao động '+current.employee+' làm việc theo '+typeLabel(t,current.type).toLowerCase()+', bắt đầu từ '+format.date(current.start)+'.',current.employee+' is employed on a '+typeLabel(t,current.type).toLowerCase()+' basis from '+format.date(current.start)+'.')}</p>
   <h3>{t('Điều 2. Tiền lương','Article 2. Salary')}</h3>
   <p>{t('Lương cơ bản ','Base salary ')+money(current.salary)+t(' mỗi tháng, trả vào ngày 5.',' per month, paid on the 5th.')}</p>
  </ResizableDialog>
 </>;
}

function CreateContract({open,t,onClose,onCreate,returnFocusRef,nextCode}:{open:boolean;t:Translate;onClose:()=>void;onCreate:(contract:Contract)=>void;returnFocusRef:RefObject<HTMLButtonElement|null>;nextCode:string}){
 const [employee,setEmployee]=useState<string|null>(null),[type,setType]=useState<ContractType|null>('fixed-12'),[start,setStart]=useState<string|null>('2026-11-03'),[salary,setSalary]=useState<number|null>(25_000_000),[tried,setTried]=useState(false);
 const valid=employee!==null&&type!==null&&start!==null&&salary!==null&&salary>0;
 const formId=useId();
 return <Dialog size="md" title={t('Tạo hợp đồng lao động','New employment contract')} description={t('Hợp đồng ở trạng thái nháp cho tới khi hai bên ký.','The contract stays a draft until both sides sign.')} value={open} onValueChange={value=>{if(!value)onClose();}} returnFocusRef={returnFocusRef}
  footer={<><Button variant="secondary" onClick={onClose}>{t('Hủy','Cancel')}</Button><Button type="submit" form={formId}>{t('Lưu','Save')}</Button></>}>
  <form id={formId} className="showcase-stack" noValidate onSubmit={event=>{event.preventDefault();setTried(true);if(valid)onCreate({code:nextCode,employee,type,start,salary,status:'draft'});}}>
   <Select<string,string> label={t('Nhân viên','Employee')} required options={PEOPLE.map(name=>({key:name,label:name,data:name}))} value={employee} onValueChange={setEmployee} error={tried&&employee===null?t('Chọn nhân viên.','Choose an employee.'):undefined}/>
   <Select<ContractType,ContractType> label={t('Loại hợp đồng','Contract type')} options={(['indefinite','fixed-12','probation'] as const).map(key=>({key,label:typeLabel(t,key),data:key}))} value={type} onValueChange={setType}/>
   <DatePicker label={t('Ngày hiệu lực','Effective date')} referenceDate="2026-10-20" value={start} onValueChange={setStart}/>
   <NumberInput label={t('Lương cơ bản (VND)','Base salary (VND)')} min={0} step={500_000} value={salary} onValueChange={setSalary}/>
  </form>
 </Dialog>;
}
