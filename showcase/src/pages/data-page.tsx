import {useMemo,useState} from 'react';
import {Badge} from '@sdcorejs/nova/badge';
import {Button} from '@sdcorejs/nova/button';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {Input} from '@sdcorejs/nova/input';
import {useConfirm} from '@sdcorejs/nova/confirm';
import {useToast} from '@sdcorejs/nova/toast';
import {useFormatter} from '@sdcorejs/nova/formatter';
import {DataTable,type Column,type TableState} from '@sdcorejs/nova/data-table';
import {QueryBar,type FilterRule,type FilterField} from '@sdcorejs/nova/query-bar';
import {QueryBuilder,type QueryNode} from '@sdcorejs/nova/query-builder';
import {serializeQuery} from '@sdcorejs/nova/query';
import {Tree,type TreeSource} from '@sdcorejs/nova/tree';
import {TreeSelect} from '@sdcorejs/nova/tree-select';
import {EntityPicker} from '@sdcorejs/nova/entity-picker';
import type {MenuAction} from '@sdcorejs/nova/types';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';
import {DEPARTMENTS,STATUS_ORDER,ascii,employees,statusText,type Employee,type EmployeeStatus} from './employees.js';

const normal=(text:string)=>ascii(text).toLowerCase().trim();
const statusLabel=(t:Translate,status:EmployeeStatus)=>t(statusText[status].vi,statusText[status].en);
/** App-owned mapping from accepted QueryBar rules to rows; the AST is never sent anywhere. */
function matchesRule(row:Employee,rule:FilterRule){
 if(typeof rule.value!=='string')return rule.value===null;
 const value=normal(rule.value);
 if(rule.fieldId==='status')return normal(statusText[row.status].vi)===value||normal(statusText[row.status].en)===value;
 if(rule.fieldId==='department')return normal(row.department)===value;
 if(rule.fieldId==='location')return normal(row.location)===value;
 return false;
}
function compare(a:Employee,b:Employee,columnId:string,collator:Intl.Collator){
 switch(columnId){
  case 'name':return collator.compare(a.givenName,b.givenName)||collator.compare(a.name,b.name);
  case 'department':return collator.compare(a.department,b.department);
  case 'startDate':return a.startDate.localeCompare(b.startDate);
  case 'salary':return a.salary-b.salary;
  case 'status':return STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status);
  default:return 0;
 }
}

export function DataPage({locale}:{locale:Locale}){
 const t=translator(locale),toast=useToast();
 return <>
  <PageHead eyebrow={labels[locale].data} title={t('Danh sách nhân sự','Employee directory')} intro={t('248 hồ sơ giả lập: lọc, sắp xếp nhiều cột, chọn hàng và xem chi tiết, 10 dòng mỗi trang.','248 simulated records: filters, multi-column sort, selection and details, 10 rows per page.')}
   actions={<><Button variant="secondary" onClick={()=>toast.show({tone:'info',title:t('Bản mẫu không tạo tệp Excel','No Excel file in this preview'),description:t('Ứng dụng thật sẽ xuất danh sách theo bộ lọc hiện tại.','A real app would export the current filtered list.')})}><Icon name="download"/>{t('Xuất Excel','Export to Excel')}</Button><Button onClick={()=>toast.show({tone:'info',title:t('Biểu mẫu thêm nhân sự chưa có trong showcase','The new-employee form is not part of this showcase'),description:t('Xem trang Biểu mẫu để thử các control nhập liệu.','See the Forms page for input controls.')})}><Icon name="plus"/>{t('Thêm nhân sự','Add employee')}</Button></>}/>
  <EmployeeDirectory t={t} locale={locale}/>
  <div className="showcase-cols showcase-cols--wide">
   <AudienceBuilder t={t}/>
   <OrgStructure t={t}/>
  </div>
  <Assignment t={t}/>
  <TypedKeys t={t}/>
 </>;
}

function EmployeeDirectory({t,locale}:{t:Translate;locale:Locale}){
 const format=useFormatter(),confirm=useConfirm();
 const [rows,setRows]=useState(employees);
 const [state,setState]=useState<TableState<string>>({page:{pageIndex:0,pageSize:10},sort:[],selectedKeys:[]});
 const [rules,setRules]=useState<readonly FilterRule[]>([{fieldId:'status',operator:'eq',value:'Đang làm việc'}]);
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState<readonly string[]>([]),[notice,setNotice]=useState<{vi:string;en:string}|null>(null);
 const fields:readonly FilterField[]=useMemo(()=>[{id:'status',label:t('Trạng thái','Status'),kind:'text',operators:['eq']},{id:'department',label:t('Phòng ban','Department'),kind:'text',operators:['eq']},{id:'location',label:t('Nơi làm việc','Location'),kind:'text',operators:['eq']}],[t]);
 const collator=useMemo(()=>new Intl.Collator(locale==='vi'?'vi':'en',{sensitivity:'base'}),[locale]);
 const resetPage=(current:TableState<string>)=>({...current,page:{...current.page,pageIndex:0}});
 // Server-like pipeline: filter → multi-sort (TableState priority order) → slice one page.
 const needle=normal(query);
 const filtered=rows.filter(row=>rules.every(rule=>matchesRule(row,rule))&&(!needle||normal(row.name).includes(needle)||row.email.includes(needle)||normal(row.id).includes(needle)));
 const sorted=[...filtered].sort((a,b)=>{for(const item of state.sort){const result=compare(a,b,item.columnId,collator);if(result)return item.direction==='asc'?result:-result;}return a.id.localeCompare(b.id);});
 const start=state.page.pageIndex*state.page.pageSize,page=sorted.slice(start,start+state.page.pageSize);
 const money=(value:number)=>format.number(value);
 const columns:readonly Column<Employee>[]=[
  {id:'name',header:t('Họ tên','Name'),sortKey:'name',cell:row=><span className="showcase-person"><span className="showcase-person__name">{row.name}</span><span className="showcase-meta">{row.email}</span></span>},
  {id:'department',header:t('Phòng ban','Department'),sortKey:'department',cell:row=>row.department},
  {id:'title',header:t('Chức danh','Title'),cell:row=>row.title},
  {id:'startDate',header:t('Ngày vào làm','Start date'),sortKey:'startDate',cell:row=><span className="showcase-num">{format.date(row.startDate)}</span>},
  {id:'salary',header:t('Lương (VND)','Salary (VND)'),sortKey:'salary',cell:row=><span className="showcase-num showcase-cell-end">{money(row.salary)}</span>},
  {id:'status',header:t('Trạng thái','Status'),sortKey:'status',cell:row=><Badge tone={statusText[row.status].tone}>{statusLabel(t,row.status)}</Badge>},
 ];
 const rowActions:readonly MenuAction<Employee>[]=[
  {id:'view',label:t('Xem hồ sơ','View profile'),onAction:row=>setNotice({vi:'Đã mở hồ sơ '+row.name+'.',en:'Opened the profile of '+row.name+'.'})},
  {id:'email',label:t('Soạn email','Write an email'),onAction:row=>setNotice({vi:'Soạn email tới '+row.email+'.',en:'Drafting an email to '+row.email+'.'})},
  {id:'offboard',label:t('Cho nghỉ việc…','Offboard…'),onAction:async row=>{
   if(row.status==='former'){setNotice({vi:row.name+' đã nghỉ việc trước đó.',en:row.name+' has already left.'});return;}
   const answer=await confirm({title:t('Cho '+row.name+' nghỉ việc?','Offboard '+row.name+'?'),description:t('Tài khoản bị khóa và hồ sơ chuyển sang trạng thái Đã nghỉ việc.','Their account is locked and the record becomes a former employee.'),confirmLabel:t('Cho nghỉ việc','Offboard'),cancelLabel:t('Giữ lại','Keep'),tone:'danger'});
   if(answer!=='confirmed')return;
   setRows(list=>list.map(item=>item.id===row.id?{...item,status:'former'}:item));
   setState(current=>({...current,selectedKeys:current.selectedKeys.filter(key=>key!==row.id)}));
   setNotice({vi:row.name+' đã chuyển sang Đã nghỉ việc.',en:row.name+' is now a former employee.'});
  }},
 ];
 const selectedCount=state.selectedKeys.length;
 return <DemoCard className="showcase-card--table" data-testid="employee-demo" title={t('Nhân sự','People')} meta={t(filtered.length+' / '+rows.length+' hồ sơ khớp bộ lọc · cập nhật 09:12',filtered.length+' of '+rows.length+' records match · updated 09:12')}
  footer={<><p className="showcase-meta" role="status">{notice?t(notice.vi,notice.en):selectedCount?t('Đã chọn '+selectedCount+' hồ sơ.',selectedCount+' records selected.'):t('Chưa chọn hồ sơ nào. Người đã nghỉ việc không chọn được.','No records selected. Former employees cannot be selected.')}</p>{selectedCount?<Button variant="ghost" onClick={()=>{setState(current=>({...current,selectedKeys:[]}));setNotice(null);}}>{t('Bỏ chọn','Clear selection')}</Button>:null}</>}>
  <div className="showcase-filter-bar" role="search" aria-label={t('Lọc nhân sự','Filter employees')}>
   <div className="showcase-search"><Input type="search" label={t('Tìm nhân sự','Search employees')} placeholder={t('Tên, email hoặc mã nhân viên','Name, email or employee ID')} value={query} onValueChange={value=>{setQuery(value);setState(resetPage);}}/></div>
   <QueryBar data-testid="query-demo" fields={fields} value={rules} onValueChange={next=>{setRules(next);setState(resetPage);}}/>
  </div>
  <DataTable className="showcase-employee-table" caption={t('Nhân sự theo bộ lọc hiện tại','Employees matching the current filters')} rows={page} getRowKey={row=>row.id} columns={columns} state={state} onStateChange={setState} total={sorted.length}
   isRowSelectable={row=>row.status!=='former'} rowActions={rowActions} expandedKeys={expanded} onExpandedKeysChange={setExpanded}
   renderExpanded={row=><dl className="showcase-facts"><div><dt>{t('Mã nhân viên','Employee ID')}</dt><dd>{row.id}</dd></div><div><dt>{t('Quản lý trực tiếp','Manager')}</dt><dd>{row.manager}</dd></div><div><dt>{t('Nơi làm việc','Location')}</dt><dd>{row.location}</dd></div><div><dt>{t('Điện thoại','Phone')}</dt><dd className="showcase-num">{row.phone}</dd></div></dl>}
   renderMobileRow={row=><div className="showcase-mobile-row"><span className="showcase-person"><span className="showcase-person__name">{row.name}</span><span className="showcase-meta">{row.email}</span></span><span>{row.department} · {row.title}</span><span className="showcase-mobile-row__meta"><Badge tone={statusText[row.status].tone}>{statusLabel(t,row.status)}</Badge><span className="showcase-num">{money(row.salary)} ₫</span></span></div>}/>
  <TechDetails t={t} topic={t('trạng thái bảng','table state')}>
   <TechRow label="Accepted filters"><output aria-label="Accepted filters">{JSON.stringify(rules)}</output></TechRow>
   <TechRow label="Employee page"><output aria-label="Employee page">{state.page.pageIndex+1}</output></TechRow>
   <TechRow label="Employee total"><output aria-label="Employee total">{sorted.length}</output></TechRow>
   <TechRow label="Employee sort"><output aria-label="Employee sort">{JSON.stringify(state.sort)}</output></TechRow>
   <TechRow label="Selected employee keys"><output aria-label="Selected employee keys">{JSON.stringify(state.selectedKeys)}</output></TechRow>
  </TechDetails>
 </DemoCard>;
}

const AUDIENCE:QueryNode={kind:'group',id:'root',logic:'and',children:[{kind:'rule',id:'department',field:'department',operator:'eq',operand:{kind:'literal',value:'Kỹ thuật'}},{kind:'rule',id:'salary',field:'salary',operator:'gte',operand:{kind:'literal',value:30_000_000}}]};
function evaluate(node:QueryNode|null,row:Employee):boolean{
 if(!node)return true;
 if(node.kind==='group')return node.logic==='and'?node.children.every(child=>evaluate(child,row)):node.children.some(child=>evaluate(child,row));
 if(node.operand.kind!=='literal')return false;
 const value=node.operand.value,actual=node.field==='salary'?row.salary:node.field==='startDate'?row.startDate:node.field==='department'?row.department:row.location;
 if(value===null||Array.isArray(value)||typeof value==='boolean')return false;
 if(node.operator==='eq')return typeof actual==='string'&&typeof value==='string'?normal(actual)===normal(value):actual===value;
 if(node.operator==='gte')return actual>=value;
 if(node.operator==='lte')return actual<=value;
 return false;
}
function AudienceBuilder({t}:{t:Translate}){
 const [query,setQuery]=useState<QueryNode|null>(AUDIENCE),[locked,setLocked]=useState(false),[proposals,setProposals]=useState(0);
 const fields:readonly FilterField[]=useMemo(()=>[{id:'department',label:t('Phòng ban','Department'),kind:'text',operators:['eq']},{id:'location',label:t('Nơi làm việc','Location'),kind:'text',operators:['eq']},{id:'salary',label:t('Lương (VND)','Salary (VND)'),kind:'number',operators:['gte','lte']},{id:'startDate',label:t('Ngày vào làm','Start date'),kind:'date',operators:['gte','lte']}],[t]);
 const matched=employees().filter(row=>row.status!=='former'&&evaluate(query,row)).length;
 return <DemoCard data-testid="builder-demo" title={t('Nhóm nhận thông báo lương','Payroll notice audience')} meta={t('Khớp '+matched+' nhân viên đang làm việc','Matches '+matched+' current employees')}>
  <Checkbox label={t('Khóa điều kiện','Lock conditions')} description={t('Khi khóa, mọi chỉnh sửa chỉ là đề xuất và nhóm giữ nguyên.','While locked, edits are only proposals and the audience stays the same.')} value={locked} onValueChange={value=>setLocked(value===true)}/>
  <QueryBuilder fields={fields} value={query} onValueChange={next=>{setProposals(count=>count+1);if(!locked)setQuery(next);}}/>
  <TechDetails t={t} topic={t('điều kiện','conditions')}>
   <TechRow label="Query proposals"><output aria-label="Query proposals">{proposals}</output></TechRow>
   <TechRow label="Serialized query"><output aria-label="Serialized query">{JSON.stringify(serializeQuery(query))}</output></TechRow>
  </TechDetails>
 </DemoCard>;
}

type Unit={id:string;label:string;children?:readonly Unit[]};
const UNITS:readonly Unit[]=[
 {id:'technology',label:'Khối Công nghệ',children:[{id:'engineering',label:'Kỹ thuật'},{id:'product',label:'Sản phẩm'},{id:'data',label:'Dữ liệu'}]},
 {id:'business',label:'Khối Kinh doanh',children:[{id:'sales',label:'Kinh doanh'},{id:'operations',label:'Vận hành'}]},
 {id:'support',label:'Khối Hỗ trợ',children:[{id:'people',label:'Nhân sự'},{id:'finance',label:'Tài chính'},{id:'legal',label:'Pháp chế'}]},
];
const units:TreeSource<Unit,string>={mode:'static',roots:UNITS,getChildren:unit=>unit.children??[]};
const unitKey=(unit:Unit)=>unit.id,unitLabel=(unit:Unit)=>unit.label;
const headcount=(unit:Unit):number=>unit.children?unit.children.reduce((sum,child)=>sum+headcount(child),0):employees().filter(row=>row.department===unit.label&&row.status!=='former').length;
function OrgStructure({t}:{t:Translate}){
 const [expanded,setExpanded]=useState<readonly string[]>([]),[selected,setSelected]=useState<readonly string[]>([]);
 const pickedUnit=UNITS.flatMap(unit=>[unit,...(unit.children??[])]).find(unit=>unit.id===selected[0]);
 return <DemoCard title={t('Cơ cấu tổ chức','Organization')} meta={t(DEPARTMENTS.length+' phòng ban trong 3 khối',DEPARTMENTS.length+' departments in 3 divisions')}
  footer={<p className="showcase-meta" role="status">{pickedUnit?pickedUnit.label+' · '+t(headcount(pickedUnit)+' người',headcount(pickedUnit)+' people'):t('Chọn một đơn vị để xem số người.','Select a unit to see its headcount.')}</p>}>
  <Tree aria-label={t('Cơ cấu tổ chức','Organization')} scopeKey="showcase-org" source={units} getKey={unitKey} getLabel={unitLabel} expandedKeys={expanded} onExpandedKeysChange={setExpanded} selectedKeys={selected} onSelectedKeysChange={setSelected} renderItem={unit=><span className="showcase-tree-item"><span>{unit.label}</span><span className="showcase-meta">{headcount(unit)}</span></span>}/>
 </DemoCard>;
}

const loadManagers=async({query,pageIndex,pageSize,signal}:{query:string;pageIndex:number;pageSize:number;signal:AbortSignal})=>{signal.throwIfAborted();const needle=normal(query),items=employees().filter(row=>row.status!=='former'&&normal(row.name).includes(needle));return{items:items.slice(pageIndex*pageSize,(pageIndex+1)*pageSize),total:items.length};};
const hydrateManagers=async(keys:readonly string[],{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();return employees().filter(row=>keys.includes(row.id));};
const employeeKey=(row:Employee)=>row.id,employeeLabel=(row:Employee)=>row.name;
function Assignment({t}:{t:Translate}){
 const [unit,setUnit]=useState<readonly string[]>([]),[manager,setManager]=useState<readonly string[]>([]);
 return <DemoCard title={t('Phân công cho nhân viên mới','Assignment for a new hire')} meta={t('Trần Minh Khang · bắt đầu 03/11/2026','Trần Minh Khang · starts 3 Nov 2026')}>
  <div className="showcase-field-grid">
   <TreeSelect label={t('Phòng ban','Department')} scopeKey="showcase-unit-picker" tree={units} getKey={unitKey} getLabel={unitLabel} value={unit} onValueChange={setUnit}/>
   <EntityPicker label={t('Quản lý trực tiếp','Direct manager')} scopeKey="showcase-managers" getKey={employeeKey} getLabel={employeeLabel} load={loadManagers} hydrate={hydrateManagers} value={manager} onValueChange={setManager}/>
  </div>
  <TechDetails t={t} topic={t('khóa đã chọn','selected keys')}>
   <TechRow label="Unit keys"><output aria-label="Unit keys">{JSON.stringify(unit)}</output></TechRow>
   <TechRow label="Owner keys"><output aria-label="Owner keys">{JSON.stringify(manager)}</output></TechRow>
  </TechDetails>
 </DemoCard>;
}

// Developer case kept from P2: number 0 and string "0" are different typed keys.
type RecordKey=number|string;
type Project={id:RecordKey;title:string};
const projects:readonly Project[]=[{id:0,title:'Atlas'},{id:'0',title:'Nova'}];
const projectKey=(row:Project)=>row.id;
function TypedKeys({t}:{t:Translate}){
 const [state,setState]=useState<TableState<RecordKey>>({page:{pageIndex:0,pageSize:1},sort:[],selectedKeys:[]});
 const sorted=[...projects].sort((a,b)=>state.sort.length?(state.sort[0]?.direction==='desc'?-1:1)*a.title.localeCompare(b.title):0);
 const start=state.page.pageIndex*state.page.pageSize;
 return <div className="showcase-typed-keys" data-testid="records-demo">
  <TechDetails t={t} topic={t('khóa hàng có kiểu (0 và "0")','typed row keys (0 and "0")')}>
   <p className="showcase-meta">{t('Hai hồ sơ có khóa số 0 và khóa chuỗi "0"; bảng giữ nguyên kiểu khi chọn, sắp xếp và chuyển trang.','Two records keyed by the number 0 and the string "0"; the table keeps each type through selection, sorting and paging.')}</p>
   <DataTable caption={t('Hồ sơ dự án','Project records')} rows={sorted.slice(start,start+state.page.pageSize)} getRowKey={projectKey} columns={[{id:'title',header:t('Tên','Title'),sortKey:'title',cell:row=>row.title}]} state={state} onStateChange={setState} total={projects.length} renderMobileRow={row=><strong>{row.title}</strong>}/>
   <TechRow label="Selected record keys"><output aria-label="Selected record keys">{JSON.stringify(state.selectedKeys)}</output></TechRow>
   <TechRow label="Record page"><output aria-label="Record page">{state.page.pageIndex+1}</output></TechRow>
   <TechRow label="Record sort"><output aria-label="Record sort">{JSON.stringify(state.sort)}</output></TechRow>
  </TechDetails>
 </div>;
}
