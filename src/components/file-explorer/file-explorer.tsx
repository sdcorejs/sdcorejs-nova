'use client';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type HTMLAttributes,type ReactNode,type Ref} from 'react';
import type {Key,LoadContext,MenuAction} from '../../types/index.js';
import type {Column} from '../data-table/data-table.js';
import type {DiagnosticOwner} from '../../lib/diagnostics.js';
import {useNovaScope,type NovaScope} from '../../providers/nova/context.js';
import {cx} from '../../lib/cx.js';
import {findHighlightRanges} from '../../lib/highlight-ranges.js';
import {Tree} from '../tree/tree.js';
import {Button} from '../button/button.js';
import {DataState} from '../data-state/data-state.js';
import {Sheet} from '../dialog/dialog.js';
import {ExplorerToolbar,itemKey,type ExplorerStrings,type Trail} from './explorer-toolbar.js';
import {ExplorerView} from './explorer-view.js';
export type ExplorerItem<T>={key:Key;name:string;kind:'file'|'folder';data:T;hasChildren?:boolean};
type ExplorerViewMode={view:'list'|'grid';onViewChange:(view:'list'|'grid')=>void}|{view?:undefined;onViewChange?:(view:'list'|'grid')=>void};
type ExplorerSelection={selectedKeys:readonly Key[];onSelectedKeysChange:(keys:readonly Key[])=>void}|{selectedKeys?:undefined;onSelectedKeysChange?:undefined};
export type FileExplorerProps<T>=Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'role'|'aria-busy'> & ExplorerViewMode & ExplorerSelection & {ref?:Ref<HTMLElement>;scopeKey:string;search?:(request:{folderKey:Key|null;query:string;signal:AbortSignal})=>Promise<readonly ExplorerItem<T>[]>;columns?:readonly Column<T>[];renderGridItem?:(data:T)=>ReactNode;onOpen?:(data:T)=>void;roots:readonly ExplorerItem<T>[];folderKey:Key|null;onFolderChange:(key:Key|null)=>void;loadChildren:(folder:ExplorerItem<T>|null,ctx:LoadContext)=>Promise<readonly ExplorerItem<T>[]>;actions?:readonly MenuAction<T>[];renderPreview?:(item:T)=>ReactNode};
const en:ExplorerStrings={name:'Files',contents:'File contents',folders:'Folders',all:'All files',back:'Back',search:'Search files',list:'List view',grid:'Grid view',file:'File',folder:'Folder',nameColumn:'Name',kindColumn:'Kind',open:'Open {name}',actions:'Actions for {name}',select:'Select {name}',preview:'Preview {name}',closePreview:'Close preview',empty:'This folder is empty',noResults:'No matching files',error:'Unable to read this folder',unknown:'This folder is unavailable',invalid:'Unable to display these files'};
const vi:ExplorerStrings={name:'Tệp',contents:'Nội dung tệp',folders:'Thư mục',all:'Tất cả tệp',back:'Quay lại',search:'Tìm tệp',list:'Dạng danh sách',grid:'Dạng thẻ',file:'Tệp',folder:'Thư mục',nameColumn:'Tên',kindColumn:'Loại',open:'Mở {name}',actions:'Thao tác cho {name}',select:'Chọn {name}',preview:'Xem trước {name}',closePreview:'Đóng xem trước',empty:'Thư mục này trống',noResults:'Không có tệp phù hợp',error:'Không thể đọc thư mục này',unknown:'Thư mục này không khả dụng',invalid:'Không thể hiển thị các tệp này'};
function explorerStrings(scope:NovaScope):ExplorerStrings{const strings=scope.strings.navigation as typeof scope.strings.navigation&Partial<Record<`explorer${Capitalize<keyof ExplorerStrings>}`,string>>,fallback=scope.locale.toLowerCase().startsWith('vi')?vi:en;return Object.fromEntries(Object.entries(fallback).map(([key,value])=>[key,strings[('explorer'+key[0]!.toUpperCase()+key.slice(1)) as keyof typeof strings]??value])) as ExplorerStrings;}
declare const process:{env:{NODE_ENV?:string}};
function diagnostic(owner:DiagnosticOwner,code:string,message:string){try{if(process.env.NODE_ENV==='production')return;}catch{/* Browser needs no process. */}const id=code+'|FileExplorer';if(owner.seen.has(id))return;owner.seen.add(id);console.warn('[nova] '+code+' <FileExplorer>: '+message);}
/** Array iteration methods skip holes; metadata must own each slot before any
 * lookup or projection. Raw consumer data is intentionally not inspected. */
function denseEvery<T>(values:readonly T[],valid:(value:T)=>boolean):boolean{if(!Array.isArray(values))return false;for(let index=0;index<values.length;index++){if(!Object.hasOwn(values,index)||!valid(values[index]!))return false;}return true;}
function validKey(key:Key):boolean{return typeof key==='string'||typeof key==='number'&&Number.isFinite(key);}
function validItems<T>(items:readonly ExplorerItem<T>[]):boolean{return denseEvery(items,item=>!!item&&typeof item.name==='string'&&(item.kind==='folder'||item.kind==='file')&&validKey(item.key))&&new Set(items.map(item=>item.key)).size===items.length;}
/** Type omissions are also enforced at the JavaScript/JSX-spread boundary. */
function safeNative<T extends object>(props:T):T{const native={...props};for(const key of ['role','dangerouslySetInnerHTML','children','aria-busy'])delete (native as Record<string,unknown>)[key];return native;}
function createOwner<T>(identity:readonly unknown[]){let active=false;const known=new Map<Key,ExplorerItem<T>>(),parents=new Map<Key,Key|null>();return{identity,known,parents,activate:()=>{active=true;},isActive:()=>active,dispose:()=>{active=false;known.clear();parents.clear();}};}
/** Ref targets the labelled section. Native root props are forwarded; role,
 * accessible name, busy state and owned action delegation remain protected.
 * Native click bubbles normally and precedes delegated D05 proposals.
 * Native capture handlers can cancel inherited descendant behavior.
 * Folder/selection are consumer-owned. No default transfer or CRUD actions. */
export function FileExplorer<T>({scopeKey,roots,folderKey,onFolderChange,loadChildren,search,columns,actions,view,onViewChange,selectedKeys,onSelectedKeysChange,renderGridItem,onOpen,renderPreview,ref,className,style,onClick,onKeyDown,'aria-label':ariaLabel,'aria-labelledby':labelledBy,...restNative}:FileExplorerProps<T>){
  const native=safeNative(restNative);
  const scope=useNovaScope(),strings=explorerStrings(scope),root=useRef<HTMLElement|null>(null),searchRef=useRef<HTMLInputElement>(null),chooserRef=useRef<HTMLButtonElement>(null);
  const owner=useMemo(()=>createOwner<T>([scopeKey,loadChildren,search]),[scopeKey,loadChildren,search]);
  const [local,setLocal]=useState<{owner:typeof owner;folder:Key|null;query:string;preview?:ExplorerItem<T>;chooser:boolean;expanded:readonly Key[]}>({owner,folder:folderKey,query:'',chooser:false,expanded:[]});
  const current=local.owner===owner&&local.folder===folderKey?local:{owner,folder:folderKey,query:'',chooser:false,expanded:[]};
  const [localView,setLocalView]=useState<'list'|'grid'>('list'),[mode,setMode]=useState({controlled:view!==undefined,view:view??'list'});
  const mountControlled=mode.controlled;
  if(mountControlled&&view!==undefined&&view!==mode.view)setMode({...mode,view});
  const modeChanged=mountControlled!==(view!==undefined);let shownView=localView;
  if(mountControlled)shownView=view??mode.view;
  const [retry,setRetry]=useState(0),remote=search&&current.query.trim()?current.query:undefined;
  const identity=useMemo(()=>({owner,folderKey,remote,retry}),[owner,folderKey,remote,retry]);
  const [read,setRead]=useState<{identity:typeof identity;status:'loading'|'ready'|'error';items:readonly ExplorerItem<T>[];message?:string}>({identity,status:'loading',items:[]});
  const currentRead=read.identity===identity?read:{identity,status:'loading' as const,items:[]};
  const rootsValid=validItems(roots),safeRoots=rootsValid?roots:[],selection=selectedKeys!==undefined&&onSelectedKeysChange!==undefined;
  const selectionPartial=(selectedKeys!==undefined||onSelectedKeysChange!==undefined)&&!selection;
  const viewInvalid=mountControlled&&(!onViewChange||view!==undefined&&view!=='list'&&view!=='grid');
  const columnsInvalid=columns!==undefined&&(!denseEvery(columns,column=>!!column&&typeof column.id==='string'&&column.id.length>0&&typeof column.cell==='function'&&(column.minWidth===undefined||Number.isFinite(column.minWidth)&&column.minWidth>=0))||columns.length===0||new Set(columns.map(column=>column.id)).size!==columns.length);
  const invalid=!rootsValid||columnsInvalid||viewInvalid||selectedKeys!==undefined&&!denseEvery(selectedKeys,validKey);
  const folder=folderKey===null?null:safeRoots.find(item=>item.key===folderKey)??owner.known.get(folderKey);
  const unknown=folderKey!==null&&(!folder||folder.kind!=='folder');
  useEffect(()=>{if(selectionPartial)diagnostic(scope.diagnostics,'NOVA_EXPLORER_INCOMPLETE_SELECTION','selection keys and callback must be supplied together');if(modeChanged)diagnostic(scope.diagnostics,'NOVA_EXPLORER_VIEW_MODE','view mode must remain stable after mount');if(viewInvalid)diagnostic(scope.diagnostics,'NOVA_EXPLORER_VIEW_CALLBACK','controlled view requires its callback');if(invalid&&!viewInvalid)diagnostic(scope.diagnostics,'NOVA_EXPLORER_INVALID_CONFIGURATION','items, keys and columns must form a valid collection');},[selectionPartial,modeChanged,viewInvalid,invalid,scope.diagnostics]);
  useLayoutEffect(()=>{owner.activate();return()=>owner.dispose();},[owner]);
  useEffect(()=>{
    if(invalid||unknown)return;
    const controller=new AbortController();let alive=true;
    const active=()=>alive&&owner.isActive()&&!controller.signal.aborted;
    let work:Promise<readonly ExplorerItem<T>[]>;
    try{work=remote!==undefined&&search?search({folderKey,query:remote,signal:controller.signal}):loadChildren(folder??null,{signal:controller.signal});}catch{work=Promise.reject();}
    void Promise.resolve(work).then(items=>{if(!active())return;if(!validItems(items)){diagnostic(scope.diagnostics,'NOVA_EXPLORER_INVALID_ITEMS','loaded items must have unique finite typed keys');setRead({identity,status:'error',items:[],message:strings.invalid});return;}for(const item of items){owner.known.set(item.key,item);if(item.kind==='folder')owner.parents.set(item.key,folderKey);}setRead({identity,status:'ready',items});},()=>{if(active())setRead({identity,status:'error',items:[],message:strings.error});});
    return()=>{alive=false;controller.abort();};
    // Root wrappers and presentation callbacks do not own reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[identity,invalid,unknown]);
  const items=currentRead.status==='ready'?(remote!==undefined?currentRead.items:currentRead.items.filter(item=>!current.query||findHighlightRanges(item.name,current.query).length>0)):[];
  const trail:Trail[]=[{key:null,name:strings.all}];if(folder){const seen=new Set<Key>(),chain:Trail[]=[];let node:ExplorerItem<T>|undefined=folder;while(node&&!seen.has(node.key)){seen.add(node.key);chain.unshift({key:node.key,name:node.name});const parent=owner.parents.get(node.key);node=parent===null||parent===undefined?undefined:owner.known.get(parent)??safeRoots.find(item=>item.key===parent);}trail.push(...chain);}
  const update=(patch:Partial<typeof current>)=>setLocal({...current,...patch});
  const navigate=(key:Key|null)=>{update({preview:undefined,chooser:false,query:''});onFolderChange(key);};
  const focus=useRef<{key:string;action:string}|null>(null),pendingFocus=useRef<{view:'list'|'grid';origin:Element|null;target:{key:string;action:string}}|null>(null);
  const describeFocus=(active:Element):{key:string;action:string}|null=>{const ownKey=active.getAttribute('data-explorer-key'),ownAction=active.getAttribute('data-explorer-action');if(ownKey&&ownAction)return{key:ownKey,action:ownAction};const wrapper=active.closest<HTMLElement>('[data-explorer-focus]');if(wrapper?.dataset.explorerKey)return{key:wrapper.dataset.explorerKey,action:wrapper.dataset.explorerFocus!};if(active.getAttribute('role')==='checkbox'){const row=active.closest('tr,[data-explorer-row]'),key=row?.getAttribute('data-explorer-row')??row?.querySelector('[data-explorer-action="open"]')?.getAttribute('data-explorer-key');if(key)return{key,action:'selection'};}return null;};
  const remember=()=>{const active=root.current?.ownerDocument.activeElement;if(active&&root.current?.contains(active)){const next=describeFocus(active);if(next)focus.current=next;}};
  useLayoutEffect(()=>{const pending=pendingFocus.current;if(!pending||shownView!==pending.view)return;pendingFocus.current=null;const active=root.current?.ownerDocument.activeElement;if(active!==pending.origin&&active!==root.current?.ownerDocument.body&&pending.origin?.isConnected)return;const button=[...(root.current?.querySelectorAll<HTMLElement>('[data-explorer-action],[role=checkbox],.nova-action-menu__trigger')??[])].find(element=>describeFocus(element)?.key===pending.target.key&&describeFocus(element)?.action===pending.target.action);button?.focus();});
  useEffect(()=>{const documentOwner=root.current?.ownerDocument;if(!documentOwner)return;const revoke=(event:Event)=>{const pending=pendingFocus.current;if(pending&&event.target!==pending.origin)pendingFocus.current=null;};documentOwner.addEventListener('focusin',revoke);documentOwner.addEventListener('pointerdown',revoke);return()=>{documentOwner.removeEventListener('focusin',revoke);documentOwner.removeEventListener('pointerdown',revoke);};},[]);
  const changeQuery=(query:string)=>{remember();pendingFocus.current=null;const active=root.current?.ownerDocument.activeElement;if(active&&root.current?.contains(active)&&active!==searchRef.current&&focus.current){const focused=items.find(item=>itemKey(item.key)===focus.current?.key);if(search||focused&&query&&!findHighlightRanges(focused.name,query).length)searchRef.current?.focus();}update({query,preview:undefined});};
  const resolveKey=(encoded:string|undefined):Key|null|undefined=>{if(encoded==='null')return null;return [...safeRoots,...owner.known.values(),...items].find(item=>itemKey(item.key)===encoded)?.key;};
  const click:HTMLAttributes<HTMLElement>['onClick']=event=>{onClick?.(event);if(event.defaultPrevented)return;const target=(event.target as Element).closest<HTMLElement>('[data-explorer-action]');if(!target||!event.currentTarget.contains(target))return;const action=target.dataset.explorerAction,key=resolveKey(target.dataset.explorerKey),item=items.find(item=>item.key===key);if(action==='list'||action==='grid'){if(shownView===action)return;if(focus.current)pendingFocus.current={view:action,origin:root.current?.ownerDocument.activeElement??null,target:focus.current};if(mountControlled)onViewChange?.(action);else setLocalView(action);}else if(action==='back')navigate(trail.at(-2)?.key??null);else if(action==='folder'&&key!==undefined)navigate(key);else if(action==='chooser')update({chooser:true});else if(action==='open'&&item){if(item.kind==='folder')navigate(item.key);else onOpen?.(item.data);}else if(action==='preview'&&item?.kind==='file')update({preview:item});else if(action==='closePreview'){const key=current.preview&&itemKey(current.preview.key);[...(root.current?.querySelectorAll<HTMLElement>('[data-explorer-action="preview"]')??[])].find(node=>node.dataset.explorerKey===key)?.focus();update({preview:undefined});}};
  const folderTree=<Tree scopeKey={scopeKey} source={{mode:'static',roots:safeRoots.filter(item=>item.kind==='folder'),getChildren:item=>[...owner.known.values()].filter(child=>child.kind==='folder'&&owner.parents.get(child.key)===item.key&&child.key!==item.key)}} getKey={item=>item.key} getLabel={item=>item.name} expandedKeys={current.expanded} onExpandedKeysChange={expanded=>update({expanded})} aria-label={strings.folders} renderItem={item=><Button variant="ghost" data-explorer-action="folder" data-explorer-key={itemKey(item.key)} onClick={event=>{if(!event.defaultPrevented)navigate(item.key);}}>{item.name}</Button>}/>;
  const attachRoot=useCallback((element:HTMLElement|null)=>{root.current=element;if(!element)return;let cleanup:(()=>void)|void;if(typeof ref==='function')cleanup=ref(element);else if(ref)ref.current=element;return()=>{root.current=null;if(typeof cleanup==='function')cleanup();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;};},[ref]);
  // Delegated actions preserve normal native bubbling. Consumers use native
  // capture props to cancel inherited Checkbox/ActionMenu behavior.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Named section delegates events to its native interactive descendants.
  return <section {...native} ref={attachRoot} aria-label={ariaLabel?.trim()||(labelledBy?undefined:strings.name)} aria-labelledby={labelledBy} aria-busy={!invalid&&!unknown&&currentRead.status==='loading'||undefined} className={cx('nova-file-explorer',className)} style={style} onClick={click} onKeyDown={onKeyDown} onClickCapture={event=>{native.onClickCapture?.(event);if(event.defaultPrevented)event.stopPropagation();}} onKeyDownCapture={event=>{native.onKeyDownCapture?.(event);if(event.defaultPrevented)event.stopPropagation();}} onFocusCapture={event=>{native.onFocusCapture?.(event);if(!event.defaultPrevented){const pending=pendingFocus.current;if(pending&&event.target!==pending.origin)pendingFocus.current=null;remember();}}} onPointerDownCapture={event=>{native.onPointerDownCapture?.(event);if(event.defaultPrevented){event.stopPropagation();return;}remember();}}>
    <ExplorerToolbar strings={strings} trail={trail} view={shownView} query={current.query} onQuery={changeQuery} searchRef={searchRef} chooserRef={chooserRef}/>
    <div className="nova-file-explorer__layout"><aside className="nova-file-explorer__folders">{folderTree}</aside><div className="nova-file-explorer__content">{invalid||unknown?<div role="alert"><DataState state="error" message={invalid?strings.invalid:strings.unknown}/></div>:currentRead.status==='error'?<div role="alert"><DataState state="error" message={currentRead.message??strings.error} onRetry={()=>{searchRef.current?.focus();setRetry(value=>value+1);}}/></div>:currentRead.status==='loading'?<DataState state="loading"/>:items.length===0?<DataState state="empty" message={current.query?strings.noResults:strings.empty}/>:<ExplorerView items={items} view={shownView} columns={columns} actions={actions} renderGridItem={renderGridItem} preview={!!renderPreview} selectedKeys={selection?selectedKeys:undefined} onSelectedKeysChange={selection?onSelectedKeysChange:undefined} strings={strings}/>}
    {current.preview&&renderPreview?<div className="nova-file-explorer__preview" role="region" aria-label={strings.preview.replaceAll('{name}',current.preview.name)}><Button variant="ghost" data-explorer-action="closePreview">{strings.closePreview}</Button>{renderPreview(current.preview.data)}</div>:null}</div></div>
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Delegates native button clicks inside the portal; native buttons provide keyboard parity. */}
    <Sheet value={current.chooser} onValueChange={chooser=>update({chooser})} title={strings.folders} side="bottom" returnFocusRef={chooserRef}><div onClick={event=>{if(event.defaultPrevented)return;const target=(event.target as Element).closest<HTMLElement>('[data-explorer-action="folder"]');const key=resolveKey(target?.dataset.explorerKey);if(target&&key!==undefined)navigate(key);}}><Button variant="ghost" data-explorer-action="folder" data-explorer-key="null">{strings.all}</Button>{folderTree}</div></Sheet>
  </section>;
}
