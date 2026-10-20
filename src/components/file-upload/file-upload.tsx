'use client';
import {useCallback,useId,useRef,useState,type Ref} from 'react';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {useNovaScope} from '../../providers/nova/context.js';
import type {SurfaceProps} from '../../types/index.js';
import {Button} from '../button/button.js';
export type FileUploadProps=SurfaceProps & {accept?:string;multiple?:boolean;maxFileBytes?:number;maxFiles?:number;disabled?:boolean;onFiles:(files:readonly File[])=>void;errors?:readonly string[];ref?:Ref<HTMLDivElement>;focusRef?:Ref<HTMLElement>};
const en={choose:'Choose files',drop:'Choose files or drop them here',size:'A file exceeds the allowed size.',type:'A file type is not accepted.',count:'Too many files selected.',invalid:'Unable to configure file selection.'};
const vi={choose:'Chọn tệp',drop:'Chọn tệp hoặc thả vào đây',size:'Một tệp vượt quá kích thước cho phép.',type:'Loại tệp không được chấp nhận.',count:'Đã chọn quá nhiều tệp.',invalid:'Không thể cấu hình chọn tệp.'};
/** accept filters selection UX only; content/MIME/quota validation remains consumer-owned. */
function accepted(file:File,accept:string|undefined){
 const filters=accept?.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)??[];
 return !filters.length||filters.some(filter=>filter.startsWith('.')?file.name.toLowerCase().endsWith(filter):filter.endsWith('/*')?file.type.toLowerCase().startsWith(filter.slice(0,-1)):file.type.toLowerCase()===filter);
}
/** Attach a consumer ref during commit and preserve its React 19 cleanup contract. */
function attachChooserRef(ref:Ref<HTMLElement>|undefined,node:HTMLElement):(()=>void)|undefined{
 if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>ref(null);}
 if(ref){ref.current=node;return ()=>{ref.current=null;};}
 return undefined;
}
export function FileUpload({accept,multiple=false,maxFileBytes,maxFiles,disabled,onFiles,errors=[],className,style,ref,focusRef,'data-testid':testId}:FileUploadProps){
 const scope=useNovaScope(),fallback=scope.locale.toLowerCase().startsWith('vi')?vi:en;
 const forms=scope.strings.forms as typeof scope.strings.forms & Partial<Record<'uploadChoose'|'uploadDrop'|'uploadSize'|'uploadType'|'uploadCount'|'uploadInvalid',string>>;
 const strings={choose:forms.uploadChoose??fallback.choose,drop:forms.uploadDrop??fallback.drop,size:forms.uploadSize??fallback.size,type:forms.uploadType??fallback.type,count:forms.uploadCount??fallback.count,invalid:forms.uploadInvalid??fallback.invalid};
 const input=useRef<HTMLInputElement>(null),id=useId(),[localErrors,setLocalErrors]=useState<readonly string[]>([]);
 // A stable callback prevents ref detach/attach on ordinary rerenders.
 const chooserRef=useCallback((node:HTMLButtonElement|null)=>{if(node)return attachChooserRef(focusRef,node);},[focusRef]);
 const invalid=[maxFileBytes,maxFiles].some(value=>value!==undefined&&(!Number.isSafeInteger(value)||value<0));
 const visibleErrors=[...errors,...localErrors];
 const choose=(files:readonly File[])=>{
  if(disabled||invalid)return;
  const issues:string[]=[],selected:File[]=[];
  const limit=multiple?maxFiles:Math.min(1,maxFiles??1);
  if(limit!==undefined&&files.length>limit){setLocalErrors([strings.count]);return;}
  for(const file of files){if(maxFileBytes!==undefined&&file.size>maxFileBytes){issues.push(strings.size);continue;}if(!accepted(file,accept)){issues.push(strings.type);continue;}selected.push(file);}
  setLocalErrors([...new Set(issues)]);if(selected.length)onFiles(selected);
 };
 if(invalid)return <div ref={ref} className={cx('nova-file-upload',className)} style={style} data-testid={testId} data-nova-config-error="NOVA_UPLOAD_INVALID_CONFIGURATION"><span role="alert">{strings.invalid}</span></div>;
 return <div ref={ref} className={cx('nova-file-upload',className)} style={style} data-testid={testId} data-disabled={disabled||undefined} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!disabled)choose(Array.from(event.dataTransfer.files));}}>
  <input ref={input} id={id} className="nova-file-upload__input" hidden type="file" aria-label={strings.choose} accept={accept} multiple={multiple} disabled={disabled} aria-invalid={visibleErrors.length>0||undefined} aria-describedby={visibleErrors.length?id+'-errors':undefined} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value='';choose(files);}}/>
  <span className="nova-file-upload__icon" aria-hidden="true"><Icon name="upload"/></span>
  <Button ref={chooserRef} variant="secondary" disabled={disabled} aria-invalid={visibleErrors.length>0||undefined} aria-describedby={visibleErrors.length?id+'-errors':undefined} onClick={()=>{if(!disabled)input.current?.click();}}>{strings.drop}</Button>
  {visibleErrors.length>0&&<div id={id+'-errors'} role="alert"><ul className="nova-file-upload__errors">{visibleErrors.map((message,index)=><li key={index}>{message}</li>)}</ul></div>}
 </div>;
}
