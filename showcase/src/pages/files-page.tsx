import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Card} from '@sdcorejs/nova/card';
import {Button} from '@sdcorejs/nova/button';
import {FileExplorer,type ExplorerItem} from '@sdcorejs/nova/file-explorer';
import {FileUpload} from '@sdcorejs/nova/file-upload';
import {useFileTransfer,type TransferAdapter} from '@sdcorejs/nova/file-transfer';
import {ImportWizard,type WorkbookAdapter,type ImportColumn,type RowIssue} from '@sdcorejs/nova/import-wizard';
import {ImagePreview} from '@sdcorejs/nova/image-preview';
import {PdfPreview,type PdfAdapter} from '@sdcorejs/nova/pdf-preview';
import {PageHeading,type Locale} from '../navigation.js';
type LocalFile={id:string;name:string;bytes:number};
const item=(id:string,name:string,kind:'file'|'folder',bytes=0):ExplorerItem<LocalFile>=>({key:id,name,kind,data:{id,name,bytes}});
const roots=[item('projects','Projects','folder'),item('personal','Personal.txt','file',12)];
const roadmap=item('roadmap','Roadmap.csv','file',22);
const loadChildren=async(folder:ExplorerItem<LocalFile>|null,{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();return folder===null?roots:folder.key==='projects'?[roadmap]:[];};
const localImage='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240"><rect width="480" height="240" fill="#173b3f"/><circle cx="360" cy="62" r="28" fill="#f4cf8c"/><path d="M0 240 160 64 310 240M180 240 350 120 480 240" fill="#80bca4"/></svg>');
const transferAdapter:TransferAdapter={
 upload:async(file,{signal,onProgress})=>{signal.throwIfAborted();const bytes=await file.arrayBuffer();signal.throwIfAborted();onProgress(bytes.byteLength,file.size);return{id:'local:'+file.name};},
 download:async(_request,{signal,onProgress})=>{signal.throwIfAborted();const blob=new Blob(['name,count\nNova,2\n'],{type:'text/csv'});onProgress(blob.size,blob.size);return blob;},
};
type Imported={name:string;count:number};
// This deliberately small CSV adapter reads the actual file. It is not a workbook engine.
const csvAdapter:WorkbookAdapter={parse:async(file,{signal})=>{
 signal.throwIfAborted();if(!/\.csv$/iu.test(file.name)||file.size>4096)throw Error('Only bounded CSV supported');
 const text=await file.text();signal.throwIfAborted();
 if(text.includes('"')||text.includes('\0'))throw Error('Quoted or binary CSV not supported');
 const rows=text.replace(/^\uFEFF/u,'').trimEnd().split(/\r?\n/u).map(line=>line.split(','));
 if(rows.length>21||rows.some(row=>row.length!==2||row.some(cell=>/^[=+@]/u.test(cell))))throw Error('Unsupported CSV structure');
 if(rows[0]?.[0]!=='name'||rows[0]?.[1]!=='count')throw Error('Expected name,count');
 return{sheets:[{name:'CSV',rows}]};
}};
const importColumns:readonly ImportColumn<Imported>[]=[{key:'name',label:'name',parse:cell=>{if(typeof cell!=='string'||!cell.trim())throw Error('Name required');return cell;}},{key:'count',label:'count',parse:cell=>{if(typeof cell!=='string'||!/^\d+$/u.test(cell))throw Error('Whole number required');return Number(cell);}}];
const validateRows=async(rows:readonly Imported[],{signal}:{signal:AbortSignal}):Promise<readonly RowIssue[]>=>{signal.throwIfAborted();return rows.flatMap((row,index)=>row.count>100?[{row:index+2,column:'count',severity:'error' as const,message:'Maximum count is 100'}]:[]);};
export function FilesPage({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en,[folder,setFolder]=useState<string|number|null>(null),[action,setAction]=useState('—'),[pdfShown,setPdfShown]=useState(true),[disposed,setDisposed]=useState(0);
 const pdfAdapter=useMemo<PdfAdapter>(()=>({open:async(source,{signal})=>{signal.throwIfAborted();if(source!=='sample-orchestration')throw Error('Unsupported sample source');let done=false;return{pageCount:2,accessibleTextLayer:true,renderPage:async(page,target,context)=>{context.signal.throwIfAborted();target.canvas.width=480;target.canvas.height=160;const drawing=target.canvas.getContext('2d');if(drawing){drawing.fillStyle='#f4f1e8';drawing.fillRect(0,0,480,160);drawing.fillStyle='#173b3f';drawing.font='20px sans-serif';drawing.fillText('Sample orchestration — '+page,20,70);}target.textLayer.replaceChildren(document.createTextNode('Sample page '+page));},dispose:()=>{if(!done){done=true;setDisposed(count=>count+1);}}};}}),[]);
 return <><PageHeading title={t('Tệp, từ chọn đến xem.','Files, from choosing to viewing.')} intro={t('Tệp và bộ chuyển đổi cục bộ với giới hạn rõ ràng. Không gọi dịch vụ từ xa.','Local files and adapters with explicit limits. No remote service calls.')}/>
 <Card className="showcase-demo"><h2>{t('Không gian tệp','File workspace')}</h2><FileExplorer data-testid="explorer-demo" aria-label={t('Tệp cục bộ','Local files')} scopeKey="showcase-local-files" roots={roots} folderKey={folder} onFolderChange={setFolder} loadChildren={loadChildren} onOpen={raw=>setAction('Open: '+raw.id)} actions={[{id:'inspect',label:t('Xem thông tin','Inspect'),onAction:raw=>setAction('Inspect: '+raw.id)}]} columns={[{id:'bytes',header:t('Số byte','Bytes'),cell:raw=>raw.bytes}]} renderGridItem={raw=><span>{raw.bytes} bytes</span>}/><p>{t('Thao tác trên đối tượng gốc','Raw object action')}: <output aria-label="Raw file action">{action}</output></p></Card>
 <Transfers locale={locale}/>
 <ImportDemo locale={locale}/>
 <Card className="showcase-demo"><h2>{t('Xem ảnh cục bộ','Local image preview')}</h2><ImagePreview src={localImage} alt={t('Phong cảnh mẫu cục bộ','Local sample landscape')}/></Card>
 <Card className="showcase-demo"><h2>{t('Luồng xem PDF mẫu','Sample PDF orchestration')}</h2><p>{t('Chỉ minh họa vòng đời bộ chuyển đổi bằng hai trang mẫu. Không đọc PDF thật; chưa xác minh thứ tự đọc bằng trình đọc màn hình.','Two sample pages demonstrate adapter lifecycle only. No real PDF is parsed; screen reader reading order remains unverified.')}</p><Button variant="secondary" onClick={()=>setPdfShown(value=>!value)}>{pdfShown?t('Ẩn PDF mẫu','Hide sample PDF'):t('Hiện PDF mẫu','Show sample PDF')}</Button>{pdfShown&&<PdfPreview title={t('Tài liệu mẫu — không phải PDF thật','Sample document — no real PDF engine')} source="sample-orchestration" adapter={pdfAdapter}/>}<output aria-label="PDF resources">Disposed: {disposed}</output></Card></>;
}
function Transfers({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en,transfer=useFileTransfer({adapter:transferAdapter,concurrency:1});
 const [preview,setPreview]=useState('—'),[outcome,setOutcome]=useState('—'),[download,setDownload]=useState<Blob|null>(null),downloadUrl=useRef<string|null>(null),alive=useRef(true),generation=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;if(downloadUrl.current)URL.revokeObjectURL(downloadUrl.current);};},[]);
 const requestPreview=async()=>{const token=generation.current,id=transfer.items.find(item=>item.direction==='upload')?.id;if(!id)return;const url=await transfer.preview(id);if(alive.current&&generation.current===token)setPreview(url?'Core-owned blob requested; clear/unmount releases it.':'Preview unavailable');};
 // This local adapter always returns Blob on success. Queue cancellation resolves void; only handoff() submits to the browser.
 const prepare=async()=>{const token=generation.current;setOutcome(t('Đang chuẩn bị','Preparing'));try{const result=await transfer.download({id:'sample-csv',name:'sample.csv'});if(!alive.current||generation.current!==token)return;if(result instanceof Blob){setDownload(result);setOutcome('Blob ready — '+result.size+' bytes; browser handoff requires Download.');}else setOutcome(t('Đã hủy tải xuống — chưa chuyển sang trình duyệt.','Download cancelled — no browser handoff.'));}catch{if(alive.current&&generation.current===token)setOutcome(t('Không thể chuẩn bị tệp.','Could not prepare file.'));}};
 function handoff(){if(!download)return;if(downloadUrl.current)URL.revokeObjectURL(downloadUrl.current);downloadUrl.current=URL.createObjectURL(download);const anchor=document.createElement('a');anchor.href=downloadUrl.current;anchor.download='sample.csv';anchor.click();setOutcome('Browser handoff requested — completion is not observable.');}
 return <Card className="showcase-demo"><h2>{t('Chuyển tệp cục bộ','Local file transfers')}</h2><p>{t('Đọc tối đa 4 KB trên máy này, không tải lên máy chủ. URL blob do core sở hữu chỉ được yêu cầu để minh họa vòng đời; ảnh mẫu dùng data URL riêng.','Read up to 4 KB on this device, without uploading to a server. A core-owned blob URL is requested for lifecycle demonstration; the sample image uses a separate data URL.')}</p><FileUpload data-testid="upload-demo" maxFileBytes={4096} maxFiles={3} multiple onFiles={transfer.enqueue}/><div className="showcase-demo-row"><Button variant="secondary" disabled={!transfer.items.some(item=>item.direction==='upload')} onClick={()=>{void requestPreview();}}>{t('Yêu cầu xem tệp đã chọn','Request upload preview')}</Button><Button variant="secondary" onClick={()=>{generation.current++;transfer.clear();setPreview('Released by clear');}}>{t('Xóa danh sách chuyển','Clear transfers')}</Button><Button variant="secondary" onClick={()=>{void prepare();}}>{t('Chuẩn bị tải xuống','Prepare download')}</Button><Button disabled={!download} onClick={handoff}>{t('Tải Blob đã chuẩn bị','Download prepared Blob')}</Button></div><ul className="showcase-p2-transfers">{transfer.items.map(item=><li key={item.id}><span>{item.name}: {item.status}</span>{(item.status==='queued'||item.status==='running')&&<Button variant="ghost" onClick={()=>transfer.cancel(item.id)}>{t('Hủy','Cancel')}</Button>}{item.status==='error'&&<Button variant="ghost" onClick={()=>transfer.retry(item.id)}>{t('Thử lại','Retry')}</Button>}</li>)}</ul><output aria-label="Transfer states" className="showcase-p2-code">{JSON.stringify(transfer.items.map(({name,status,outcome})=>({name,status,outcome})))}</output><p><output aria-label="Preview ownership">{preview}</output></p><p><output aria-label="Download outcome">{outcome}</output></p></Card>;
}
function ImportDemo({locale}:{locale:Locale}){
 const t=(vi:string,en:string)=>locale==='vi'?vi:en,[count,setCount]=useState(0);
 const commit=useCallback(async(rows:readonly Imported[],{signal}:{signal:AbortSignal})=>{signal.throwIfAborted();setCount(rows.length);return{status:'success' as const};},[]);
 return <Card className="showcase-demo"><h2>{t('Nhập CSV có giới hạn','Bounded CSV import')}</h2><p>{t('Chọn CSV UTF-8 tối đa 4 KB, 20 dòng, tiêu đề name,count. Không hỗ trợ dấu ngoặc kép, công thức hoặc workbook. Đây không phải bằng chứng an toàn macro/archive/workbook.','Choose UTF-8 CSV up to 4 KB and 20 rows, with name,count headers. Quoting, formulas and workbooks are unsupported. This does not prove macro/archive/workbook safety.')}</p><ImportWizard data-testid="import-demo" adapter={csvAdapter} columns={importColumns} validate={validateRows} onCommit={commit} maxRows={20} maxFileBytes={4096}/><p>{t('Dòng giữ trong trang','Rows kept in this page')}: <output aria-label="Imported rows">{count}</output></p></Card>;
}
