import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@sdcorejs/nova/button';
import {Badge} from '@sdcorejs/nova/badge';
import {FileExplorer,type ExplorerItem} from '@sdcorejs/nova/file-explorer';
import {FileUpload} from '@sdcorejs/nova/file-upload';
import {useFileTransfer,type TransferAdapter,type TransferState} from '@sdcorejs/nova/file-transfer';
import {ImportWizard,type WorkbookAdapter,type ImportColumn,type RowIssue} from '@sdcorejs/nova/import-wizard';
import {ImagePreview} from '@sdcorejs/nova/image-preview';
import {PdfPreview,type PdfAdapter} from '@sdcorejs/nova/pdf-preview';
import {labels,type Locale} from '../navigation.js';
import {DemoCard,Icon,PageHead,TechDetails,TechRow,translator,type Translate} from '../ui.js';

type StoredFile={id:string;name:string;bytes:number};
const item=(id:string,name:string,kind:'file'|'folder',bytes=0):ExplorerItem<StoredFile>=>({key:id,name,kind,data:{id,name,bytes}});
const roots=[item('contracts','Hợp đồng 2026','folder'),item('pay-policy','Quy_che_luong_2026.pdf','file',1_258_291)];
const contracts=[item('contract-0412','HDLD-2026-0412.pdf','file',250_880),item('contract-0398','HDLD-2026-0398.pdf','file',238_592)];
const loadChildren=async(folder:ExplorerItem<StoredFile>|null,{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();return folder===null?roots:folder.key==='contracts'?contracts:[];};
const portrait='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320"><rect width="240" height="320" fill="#dfe7ec"/><circle cx="120" cy="128" r="54" fill="#8aa1ad"/><path d="M28 320c6-70 46-108 92-108s86 38 92 108z" fill="#5f7682"/></svg>');
const TEMPLATE='name,days\nNguyễn An,2\n';
const transferAdapter:TransferAdapter={
 upload:async(file,{signal,onProgress})=>{signal.throwIfAborted();const bytes=await file.arrayBuffer();signal.throwIfAborted();onProgress(bytes.byteLength,file.size);return{id:'local:'+file.name};},
 download:async(_request,{signal,onProgress})=>{signal.throwIfAborted();const blob=new Blob([TEMPLATE],{type:'text/csv'});onProgress(blob.size,blob.size);return blob;},
};
const DOWNLOAD_NAME='mau_so_ngay_phep.csv';
const sizeText=(bytes:number,locale:Locale)=>bytes>=1_048_576?(bytes/1_048_576).toLocaleString(locale==='vi'?'vi-VN':'en-GB',{maximumFractionDigits:1})+' MB':bytes>=1024?Math.round(bytes/1024)+' KB':bytes+' B';

export function FilesPage({locale}:{locale:Locale}){
 const t=translator(locale);
 return <>
  <PageHead eyebrow={labels[locale].files} title={t('Giấy tờ nhân sự','Employee documents')} intro={t('Tải giấy tờ lên, xem trước và nhập số ngày phép từ tệp CSV. Mọi tệp chỉ được đọc trên máy này.','Upload documents, preview them and import leave balances from a CSV file. Files are only read on this device.')}/>
  <div className="showcase-cols">
   <Transfers t={t}/>
   <DemoCard title={t('Ảnh thẻ nhân viên','Employee ID photo')} meta={t('Nguyễn An · cập nhật 12/09/2026','Nguyễn An · updated 12 Sep 2026')}><ImagePreview src={portrait} alt={t('Ảnh thẻ của Nguyễn An (ảnh minh họa)','ID photo of Nguyễn An (illustration)')}/></DemoCard>
  </div>
  <Folders t={t} locale={locale}/>
  <ImportDemo t={t}/>
  <ContractPdf t={t}/>
 </>;
}

type Phase='idle'|'preparing'|'ready'|'cancelled'|'failed'|'handed-off';
function Transfers({t}:{t:Translate}){
 const transfer=useFileTransfer({adapter:transferAdapter,concurrency:1});
 const [preview,setPreview]=useState('—'),[previewUrl,setPreviewUrl]=useState<string|null>(null),[outcome,setOutcome]=useState('—'),[phase,setPhase]=useState<Phase>('idle'),[download,setDownload]=useState<Blob|null>(null);
 const downloadUrl=useRef<string|null>(null),alive=useRef(true),generation=useRef(0);
 useEffect(()=>{const owned=downloadUrl,requests=generation;alive.current=true;return()=>{alive.current=false;requests.current++;if(owned.current)URL.revokeObjectURL(owned.current);};},[]);
 const firstUpload=transfer.items.find(entry=>entry.direction==='upload');
 const requestPreview=async()=>{const token=generation.current;if(!firstUpload)return;const url=await transfer.preview(firstUpload.id);if(alive.current&&generation.current===token){setPreview(url?'Core-owned blob requested; clear/unmount releases it.':'Preview unavailable');setPreviewUrl(url??null);}};
 // The local adapter returns a file on success. A cancelled queue entry resolves void; only handoff() gives the file to the browser.
 const prepare=async()=>{const token=generation.current;setPhase('preparing');setOutcome(t('Đang chuẩn bị','Preparing'));try{const result=await transfer.download({id:'leave-template',name:DOWNLOAD_NAME});if(!alive.current||generation.current!==token)return;if(result instanceof Blob){setDownload(result);setPhase('ready');setOutcome('Blob ready — '+result.size+' bytes; browser handoff requires Download.');}else{setPhase('cancelled');setOutcome(t('Đã hủy tải xuống — chưa chuyển sang trình duyệt.','Download cancelled — no browser handoff.'));}}catch{if(alive.current&&generation.current===token){setPhase('failed');setOutcome(t('Không thể chuẩn bị tệp.','Could not prepare file.'));}}};
 function handoff(){if(!download)return;if(downloadUrl.current)URL.revokeObjectURL(downloadUrl.current);downloadUrl.current=URL.createObjectURL(download);const anchor=document.createElement('a');anchor.href=downloadUrl.current;anchor.download=DOWNLOAD_NAME;anchor.click();setPhase('handed-off');setOutcome('Browser handoff requested — completion is not observable.');}
 const phaseText:Record<Phase,string>={idle:t('Mẫu số ngày phép chưa được chuẩn bị.','The leave template is not prepared yet.'),preparing:t('Đang chuẩn bị tệp mẫu…','Preparing the template…'),ready:t('Tệp mẫu đã sẵn sàng để tải.','The template is ready to download.'),cancelled:t('Đã hủy chuẩn bị tệp mẫu.','Template preparation cancelled.'),failed:t('Không chuẩn bị được tệp mẫu. Hãy thử lại.','Could not prepare the template. Try again.'),'handed-off':t('Đã chuyển tệp cho trình duyệt tải về.','The file was handed to the browser.')};
 const statusText=(entry:TransferState)=>entry.status==='queued'?t('Đang chờ','Queued'):entry.status==='running'?entry.direction==='upload'?t('Đang tải lên','Uploading'):t('Đang chuẩn bị','Preparing'):entry.status==='success'?entry.direction==='upload'?t('Đã tải lên','Uploaded'):t('Sẵn sàng','Ready'):entry.status==='error'?t('Lỗi','Failed'):t('Đã hủy','Cancelled');
 const tone=(entry:TransferState)=>entry.status==='success'?'success' as const:entry.status==='error'?'error' as const:entry.status==='running'?'info' as const:'neutral' as const;
 return <DemoCard title={t('Giấy tờ của Nguyễn An','Nguyễn An documents')} meta={t('Căn cước, bằng cấp, hợp đồng đã ký · tối đa 3 tệp, mỗi tệp 4 KB','ID card, diplomas, signed contracts · up to 3 files, 4 KB each')}
  footer={<><p className="showcase-meta" role="status">{phaseText[phase]}</p><div className="showcase-toolbar"><Button variant="secondary" onClick={()=>{void prepare();}}>{t('Chuẩn bị mẫu số ngày phép','Prepare leave template')}</Button><Button disabled={!download} onClick={handoff}>{t('Tải tệp đã chuẩn bị','Download prepared file')}</Button></div></>}>
  <FileUpload data-testid="upload-demo" maxFileBytes={4096} maxFiles={3} multiple onFiles={transfer.enqueue}/>
  {transfer.items.length?<ul className="showcase-list showcase-transfers">{transfer.items.map(entry=><li key={entry.id} data-status={entry.status} data-direction={entry.direction}>
   <span className="showcase-list__icon"><Icon name={entry.direction==='upload'?'upload':'download'}/></span>
   <span className="showcase-list__text"><span className="showcase-ellipsis">{entry.name}</span></span>
   <Badge tone={tone(entry)}>{statusText(entry)}</Badge>
   {(entry.status==='queued'||entry.status==='running')&&<Button variant="ghost" size="sm" aria-label={t('Hủy ','Cancel ')+entry.name} onClick={()=>transfer.cancel(entry.id)}>{t('Hủy','Cancel')}</Button>}
   {entry.status==='error'&&<Button variant="ghost" size="sm" aria-label={t('Thử lại ','Retry ')+entry.name} onClick={()=>transfer.retry(entry.id)}>{t('Thử lại','Retry')}</Button>}
  </li>)}</ul>:<p className="showcase-muted">{t('Chưa có tệp nào.','No files yet.')}</p>}
  <div className="showcase-toolbar">
   <Button variant="secondary" size="sm" disabled={!firstUpload} onClick={()=>{void requestPreview();}}>{t('Xem trước tệp đã tải','Preview uploaded file')}</Button>
   {previewUrl?<a className="showcase-link" href={previewUrl} target="_blank" rel="noopener noreferrer">{t('Mở bản xem trước','Open preview')}</a>:null}
   <Button variant="ghost" size="sm" disabled={!transfer.items.length} onClick={()=>{generation.current++;transfer.clear();setPreview('Released by clear');setPreviewUrl(null);}}>{t('Xóa danh sách','Clear list')}</Button>
  </div>
  <TechDetails t={t} topic={t('trạng thái truyền tệp','transfer state')}>
   <TechRow label="Transfer states"><output aria-label="Transfer states">{JSON.stringify(transfer.items.map(({name,status,outcome})=>({name,status,outcome})))}</output></TechRow>
   <TechRow label="Preview ownership"><output aria-label="Preview ownership">{preview}</output></TechRow>
   <TechRow label="Download outcome"><output aria-label="Download outcome">{outcome}</output></TechRow>
  </TechDetails>
 </DemoCard>;
}

function Folders({t,locale}:{t:Translate;locale:Locale}){
 const [folder,setFolder]=useState<string|number|null>(null),[action,setAction]=useState('—'),[opened,setOpened]=useState<string|null>(null);
 return <DemoCard title={t('Thư mục hồ sơ','Record folders')} meta={t('Phòng Nhân sự · chỉ đọc','HR department · read-only')}
  footer={<p className="showcase-meta" role="status">{opened?t('Đã mở ','Opened ')+opened+'.':t('Chọn một tệp để mở.','Choose a file to open it.')}</p>}>
  <FileExplorer data-testid="explorer-demo" aria-label={t('Thư mục hồ sơ nhân sự','HR record folders')} scopeKey="showcase-hr-files" roots={roots} folderKey={folder} onFolderChange={setFolder} loadChildren={loadChildren} onOpen={raw=>{setAction('Open: '+raw.id);setOpened(raw.name);}} actions={[{id:'inspect',label:t('Xem thông tin','View details'),onAction:raw=>{setAction('Inspect: '+raw.id);setOpened(raw.name);}}]} columns={[{id:'size',header:t('Dung lượng','Size'),cell:raw=>raw.bytes?sizeText(raw.bytes,locale):'—'}]} renderGridItem={raw=><span>{raw.bytes?sizeText(raw.bytes,locale):t('Thư mục','Folder')}</span>}/>
  <TechDetails t={t} topic={t('thao tác','action')}><TechRow label="Raw file action"><output aria-label="Raw file action">{action}</output></TechRow></TechDetails>
 </DemoCard>;
}

type LeaveRow={name:string;days:number};
// Deliberately small CSV reader for this page: it reads the actual file and refuses anything else.
const csvAdapter:WorkbookAdapter={parse:async(file,{signal})=>{
 signal.throwIfAborted();if(!/\.csv$/iu.test(file.name)||file.size>4096)throw Error('Only bounded CSV supported');
 const text=await file.text();signal.throwIfAborted();
 if(text.includes('"')||text.includes('\0'))throw Error('Quoted or binary CSV not supported');
 const rows=text.replace(/^﻿/u,'').trimEnd().split(/\r?\n/u).map(line=>line.split(','));
 if(rows.length>21||rows.some(row=>row.length!==2||row.some(cell=>/^[=+@-]/u.test(cell))))throw Error('Unsupported CSV structure');
 if(rows[0]?.[0]!=='name'||rows[0]?.[1]!=='days')throw Error('Expected name,days');
 return{sheets:[{name:'CSV',rows}]};
}};
function ImportDemo({t}:{t:Translate}){
 const [count,setCount]=useState(0);
 const columns=useMemo<readonly ImportColumn<LeaveRow>[]>(()=>[{key:'name',label:t('Họ tên','Full name'),parse:cell=>{if(typeof cell!=='string'||!cell.trim())throw Error('Name required');return cell.trim();}},{key:'days',label:t('Số ngày phép','Leave days'),parse:cell=>{if(typeof cell!=='string'||!/^\d+$/u.test(cell))throw Error('Whole number required');return Number(cell);}}],[t]);
 const validate=useCallback(async(rows:readonly LeaveRow[],{signal}:{signal:AbortSignal}):Promise<readonly RowIssue[]>=>{signal.throwIfAborted();return rows.flatMap((row,index)=>row.days>30?[{row:index+2,column:'days',severity:'error' as const,message:t('Tối đa 30 ngày phép.','At most 30 days of leave.')}]:[]);},[t]);
 const commit=useCallback(async(rows:readonly LeaveRow[],{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();setCount(rows.length);return{status:'success' as const};},[]);
 return <DemoCard title={t('Nhập số ngày phép từ CSV','Import leave balances from CSV')} meta={t('Hai cột: name (họ tên) và days (số ngày) · tối đa 20 dòng, 4 KB','Two columns: name and days · up to 20 rows, 4 KB')}
  footer={<p className="showcase-meta" role="status">{count?t('Đã nhập '+count+' dòng vào bảng số dư phép.','Imported '+count+' rows into the leave balances.'):t('Chưa nhập dòng nào. Công thức và tệp Excel không được hỗ trợ.','Nothing imported yet. Formulas and Excel files are not supported.')}</p>}>
  <ImportWizard data-testid="import-demo" adapter={csvAdapter} columns={columns} validate={validate} onCommit={commit} maxRows={20} maxFileBytes={4096}/>
  <TechDetails t={t}><TechRow label="Imported rows"><output aria-label="Imported rows">{count}</output></TechRow></TechDetails>
 </DemoCard>;
}

function ContractPdf({t}:{t:Translate}){
 const [shown,setShown]=useState(true),[disposed,setDisposed]=useState(0);
 const adapter=useMemo<PdfAdapter>(()=>({open:async(source,{signal})=>{signal.throwIfAborted();if(source!=='contract-0412')throw Error('Unsupported sample source');let done=false;return{pageCount:2,accessibleTextLayer:true,renderPage:async(page,target,context)=>{context.signal.throwIfAborted();target.canvas.width=480;target.canvas.height=200;const drawing=target.canvas.getContext('2d');if(drawing){drawing.fillStyle='#ffffff';drawing.fillRect(0,0,480,200);drawing.fillStyle='#171717';drawing.font='600 18px sans-serif';drawing.fillText('HỢP ĐỒNG LAO ĐỘNG · HĐLĐ-2026-0412',24,48);drawing.font='14px sans-serif';drawing.fillStyle='#5c5c63';drawing.fillText('Trang '+page+' / 2',24,80);}target.textLayer.replaceChildren(document.createTextNode('Hợp đồng lao động HĐLĐ-2026-0412, trang '+page));},dispose:()=>{if(!done){done=true;setDisposed(count=>count+1);}}};}}),[]);
 return <DemoCard title={t('Hợp đồng lao động (PDF)','Employment contract (PDF)')} meta={t('Bản xem trước dùng hai trang mẫu dựng sẵn, không đọc tệp PDF thật.','The preview uses two prepared sample pages; no real PDF file is read.')}
  actions={<Button variant="secondary" size="sm" onClick={()=>setShown(value=>!value)}>{shown?t('Ẩn bản xem trước','Hide preview'):t('Hiện bản xem trước','Show preview')}</Button>}>
  {shown?<PdfPreview title={t('Hợp đồng HĐLĐ-2026-0412','Contract HĐLĐ-2026-0412')} source="contract-0412" adapter={adapter}/>:<p className="showcase-muted">{t('Bản xem trước đang ẩn.','The preview is hidden.')}</p>}
  <TechDetails t={t}><TechRow label="PDF resources"><output aria-label="PDF resources">Disposed: {disposed}</output></TechRow></TechDetails>
 </DemoCard>;
}
