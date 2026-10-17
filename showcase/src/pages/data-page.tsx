import {useMemo,useState} from 'react';
import {Card} from '@sdcorejs/nova/card';
import {Checkbox} from '@sdcorejs/nova/checkbox';
import {DataTable,type TableState} from '@sdcorejs/nova/data-table';
import {QueryBar,type FilterRule,type FilterField} from '@sdcorejs/nova/query-bar';
import {QueryBuilder,type QueryNode} from '@sdcorejs/nova/query-builder';
import {serializeQuery} from '@sdcorejs/nova/query';
import {Tree,type TreeSource} from '@sdcorejs/nova/tree';
import {TreeSelect} from '@sdcorejs/nova/tree-select';
import {EntityPicker} from '@sdcorejs/nova/entity-picker';
import {PageHeading,type Locale} from '../navigation.js';
type RecordKey=number|string;
type Project={id:RecordKey;title:string;active:boolean};
const projects:readonly Project[]=[{id:0,title:'Atlas',active:false},{id:'0',title:'Nova',active:false},{id:2,title:'Orion',active:true}];
const projectKey=(row:Project)=>row.id,projectLabel=(row:Project)=>row.title;
type Folder={id:string;label:string;children?:readonly Folder[]};
const folderRoots:readonly Folder[]=[{id:'projects',label:'Projects',children:[{id:'design',label:'Design'}]},{id:'archive',label:'Archive'}];
const folders:TreeSource<Folder,string>={mode:'static',roots:folderRoots,getChildren:folder=>folder.children??[]};
const folderKey=(folder:Folder)=>folder.id,folderLabel=(folder:Folder)=>folder.label;
const loadOwners=async({query,pageIndex,pageSize,signal}:{query:string;pageIndex:number;pageSize:number;signal:AbortSignal})=>{signal.throwIfAborted();const items=projects.filter(row=>row.title.toLowerCase().includes(query.toLowerCase()));return{items:items.slice(pageIndex*pageSize,(pageIndex+1)*pageSize),total:items.length};};
const hydrateOwners=async(keys:readonly RecordKey[],{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();return projects.filter(row=>keys.includes(row.id));};
const initialQuery:QueryNode={kind:'group',id:'root',logic:'and',children:[{kind:'rule',id:'active',field:'active',operator:'eq',operand:{kind:'literal',value:false}}]};
export function DataPage({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en;
 const [state,setState]=useState<TableState<RecordKey>>({page:{pageIndex:0,pageSize:1},sort:[],selectedKeys:[]});
 const [rules,setRules]=useState<readonly FilterRule[]>([{fieldId:'active',operator:'eq',value:false}]);
 const [query,setQuery]=useState<QueryNode|null>(initialQuery),[keepQuery,setKeepQuery]=useState(false),[proposals,setProposals]=useState(0);
 const [expanded,setExpanded]=useState<readonly string[]>([]),[selected,setSelected]=useState<readonly string[]>([]),[owner,setOwner]=useState<readonly RecordKey[]>([]),[folderSelection,setFolderSelection]=useState<readonly string[]>([]);
 const fields:readonly FilterField[]=useMemo(()=>[{id:'active',label:locale==='vi'?'Đang hoạt động':'Active',kind:'boolean',operators:['eq']},{id:'title',label:locale==='vi'?'Tên':'Title',kind:'text',operators:['eq']}],[locale]);
 // Mapping belongs to this application. The semantic AST is never sent to SQL or an authorization service.
 const filtered=projects.filter(row=>rules.every(rule=>rule.fieldId==='active'?row.active===rule.value:rule.fieldId==='title'?row.title===rule.value:false));
 const sorted=[...filtered].sort((a,b)=>state.sort.length?(state.sort[0]?.direction==='desc'?-1:1)*a.title.localeCompare(b.title):0);
 const start=state.page.pageIndex*state.page.pageSize;
 return <><PageHeading title={t('Nhìn rõ dữ liệu của bạn.','A clearer view of your data.')} intro={t('Bảng, điều kiện và lựa chọn với dữ liệu cục bộ. Ứng dụng sở hữu ánh xạ và quyền truy cập.','Tables, conditions and selections with local data. The application owns mapping and access decisions.')}/>
 <Card className="showcase-demo" data-testid="query-demo"><h2>{t('Bộ lọc nhanh','Quick filters')}</h2><QueryBar fields={fields} value={rules} onValueChange={next=>{setRules(next);setState(current=>({...current,page:{...current.page,pageIndex:0}}));}}/><output aria-label="Accepted filters" className="showcase-p2-code">{JSON.stringify(rules)}</output></Card>
 <Card className="showcase-demo"><h2>{t('Hồ sơ dự án','Project records')}</h2><DataTable caption={t('Hồ sơ dự án','Project records')} rows={sorted.slice(start,start+state.page.pageSize)} getRowKey={projectKey} columns={[{id:'title',header:t('Tên','Title'),sortKey:'title',cell:row=>row.title}]} state={state} onStateChange={setState} hasNextPage={start+state.page.pageSize<sorted.length} renderMobileRow={row=><strong>{row.title}</strong>}/><div className="showcase-p2-summary"><span>{t('Khóa đã chọn','Selected keys')}: <output aria-label="Selected record keys">{JSON.stringify(state.selectedKeys)}</output></span><span>{t('Trang','Page')}: <output aria-label="Record page">{state.page.pageIndex+1}</output></span><output aria-label="Record sort">{JSON.stringify(state.sort)}</output></div></Card>
 <Card className="showcase-demo" data-testid="builder-demo"><h2>{t('Điều kiện có cấu trúc','Structured conditions')}</h2><Checkbox label={t('Giữ nguyên điều kiện','Keep query unchanged')} value={keepQuery} onValueChange={value=>setKeepQuery(value===true)}/><QueryBuilder fields={fields} value={query} onValueChange={next=>{setProposals(count=>count+1);if(!keepQuery)setQuery(next);}}/><p>{t('Đề xuất','Proposals')}: <output aria-label="Query proposals">{proposals}</output></p><output aria-label="Serialized query" className="showcase-p2-code">{JSON.stringify(serializeQuery(query))}</output></Card>
 <div className="showcase-p2-grid"><Card className="showcase-demo"><h2>{t('Thư mục dự án','Project folders')}</h2><Tree aria-label={t('Thư mục dự án','Project folders')} scopeKey="showcase-folders" source={folders} getKey={folderKey} getLabel={folderLabel} expandedKeys={expanded} onExpandedKeysChange={setExpanded} selectedKeys={selected} onSelectedKeysChange={setSelected}/></Card><Card className="showcase-demo"><h2>{t('Lựa chọn rõ ràng','Explicit selections')}</h2><TreeSelect label={t('Chọn thư mục','Folder selection')} scopeKey="showcase-folder-picker" tree={folders} getKey={folderKey} getLabel={folderLabel} value={folderSelection} onValueChange={setFolderSelection}/><EntityPicker label={t('Chủ dự án','Project owner')} scopeKey="showcase-owners" getKey={projectKey} getLabel={projectLabel} load={loadOwners} hydrate={hydrateOwners} value={owner} onValueChange={setOwner}/><output aria-label="Owner keys">{JSON.stringify(owner)}</output></Card></div></>;
}
