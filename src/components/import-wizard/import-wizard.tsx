'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type Ref} from 'react';
import type {SurfaceProps,LoadContext} from '../../types/index.js';
import {useNovaScope} from '../../providers/nova/context.js';
import {cx} from '../../lib/cx.js';
import {Button} from '../button/button.js';
import {FileUpload} from '../file-upload/file-upload.js';
import {Stepper} from '../stepper/stepper.js';
import {ImportMapping} from './import-mapping.js';
import {ImportReview} from './import-review.js';
import {copyIssues,copyWorkbook,importStrings,initialMapping,mappingIssues,message,parseRows,validConfig,type Workbook} from './import-model.js';
export type ImportColumn<T> = {[K in Extract<keyof T,string>]:{key:K;label:string;parse:(cell:unknown)=>T[K]}}[Extract<keyof T,string>];
/** Source indexes: the header is row 1; the first data row is row 2. */
export type RowIssue={row:number;column?:string;severity:'error'|'warning';message:string};
/** Consumer owns engine safety, decompression bounds, formulas/macros and external-reference denial. */
export type WorkbookAdapter={parse:(file:File,ctx:LoadContext)=>Promise<{sheets:readonly {name:string;rows:readonly (readonly unknown[])[]}[]}>};
export type ImportWizardProps<T>=SurfaceProps&{/** Ref to the stable outer .nova-import-wizard div, including configuration errors. */ref?:Ref<HTMLDivElement>;adapter:WorkbookAdapter;columns:readonly ImportColumn<T>[];validate:(rows:readonly T[],ctx:LoadContext)=>Promise<readonly RowIssue[]>;onCommit:(rows:readonly T[],ctx:LoadContext)=>Promise<{status:'success'}|{status:'rejected';issues:readonly RowIssue[]}>;maxRows:number;maxFileBytes:number};
type Validated<T>={revision:number;rows:readonly T[];columns:readonly ImportColumn<T>[];adapter:WorkbookAdapter;validate:ImportWizardProps<T>['validate'];maxRows:number;maxFileBytes:number};
export function ImportWizard<T>({ref,adapter,columns,validate,onCommit,maxRows,maxFileBytes,className,style,'data-testid':testId}:ImportWizardProps<T>){
 const strings=importStrings(useNovaScope()),id=useId(),summary=useRef<HTMLDivElement>(null),chooserFocus=useRef<HTMLElement>(null),pendingFocus=useRef<string|undefined>(undefined);
 const [workbook,setWorkbook]=useState<Workbook>(),[sheetIndex,setSheetIndex]=useState(0),[mapping,setMapping]=useState<Readonly<Record<string,number>>>({}),[step,setStep]=useState(0),[busy,setBusy]=useState<'parse'|'validate'|'commit'>(),[issues,setIssues]=useState<readonly RowIssue[]>([]),[status,setStatus]=useState(''),[commitError,setCommitError]=useState(''),[ack,setAck]=useState(false),[complete,setComplete]=useState(false),[focusVersion,setFocusVersion]=useState(0);
 const revision=useRef(0),operation=useRef<AbortController|undefined>(undefined),validated=useRef<Validated<T>|undefined>(undefined),commitFlight=useRef(false),alive=useRef(false);
 const visibleIssues=commitError?[{row:1,severity:'error' as const,message:commitError}]:issues;
 const sheet=workbook?.sheets[sheetIndex],invalid=!validConfig(columns,maxRows,maxFileBytes);
 const invalidate=()=>{revision.current++;operation.current?.abort();operation.current=undefined;validated.current=undefined;setBusy(undefined);setAck(false);setComplete(false);setCommitError('');};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- Revision is a request generation counter, not a DOM ref; cleanup must invalidate its current generation.
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;revision.current++;operation.current?.abort();};},[]);
 // A changed consumer contract invalidates an external in-flight request and its visible snapshot before paint.
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the request lifecycle and local UI when its consumer contract changes.
 useLayoutEffect(()=>{revision.current++;operation.current?.abort();operation.current=undefined;validated.current=undefined;setBusy(undefined);setAck(false);setComplete(false);setIssues([]);setStep(current=>current>0?1:current);},[columns,adapter,validate,maxRows,maxFileBytes]);
 useLayoutEffect(()=>{if(focusVersion)summary.current?.focus();},[focusVersion]);
 useLayoutEffect(()=>{const target=pendingFocus.current;if(target){pendingFocus.current=undefined;summary.current?.ownerDocument.getElementById(target)?.focus();}},[step]);
 const error=(text:string,focus=false)=>{setIssues([{row:1,severity:'error',message:text}]);if(focus)setFocusVersion(value=>value+1);};
 const choose=async(files:readonly File[])=>{
  const file=files[0];if(!file||invalid||commitFlight.current)return;invalidate();setWorkbook(undefined);setStep(0);setIssues([]);setStatus('');
  if(file.size>maxFileBytes)return error(strings.limit);
  const token=revision.current,controller=new AbortController();operation.current=controller;setBusy('parse');setStatus(strings.parsing);
  try{const raw=await adapter.parse(file,{signal:controller.signal});if(!alive.current||controller.signal.aborted||token!==revision.current)return;const result=copyWorkbook(raw);setWorkbook(result);setSheetIndex(0);setMapping(initialMapping(result.sheets[0],columns));setStatus(strings.ready);}
  catch{if(alive.current&&!controller.signal.aborted&&token===revision.current){error(strings.parse);setStatus('');}}
  finally{if(alive.current&&token===revision.current&&!controller.signal.aborted){setBusy(undefined);operation.current=undefined;}}
 };
 const edit=(nextMapping:Readonly<Record<string,number>>,index=sheetIndex)=>{if(commitFlight.current)return;invalidate();setSheetIndex(index);setMapping(nextMapping);setIssues([]);setStatus('');};
 const next=async()=>{
  if(invalid||busy||commitFlight.current)return;
  if(step===0){if(!workbook)return error(strings.parse,true);setStep(1);setIssues([]);return;}
  if(step===2){if(issues.some(issue=>issue.severity==='error')){setFocusVersion(value=>value+1);return;}if(validated.current)setStep(3);return;}
  if(step!==1)return;
  const found=mappingIssues(sheet,columns,mapping,maxRows,strings);if(found.length){setIssues(found);setFocusVersion(value=>value+1);return;}
  invalidate();const parsed=parseRows(sheet!,columns,mapping,strings);setIssues(parsed.issues);
  if(parsed.issues.length){setStep(2);setFocusVersion(value=>value+1);return;}
  const token=revision.current,controller=new AbortController();operation.current=controller;setBusy('validate');setStatus(strings.validating);
  try{const raw=await validate(parsed.rows,{signal:controller.signal});if(!alive.current||controller.signal.aborted||token!==revision.current)return;const found=copyIssues(raw);
   validated.current={revision:token,rows:parsed.rows,columns,adapter,validate,maxRows,maxFileBytes};setIssues(found);setStep(2);setStatus('');if(found.some(issue=>issue.severity==='error'))setFocusVersion(value=>value+1);
  }catch{if(alive.current&&!controller.signal.aborted&&token===revision.current){error(strings.validation,true);setStatus('');}}
  finally{if(alive.current&&!controller.signal.aborted&&token===revision.current){setBusy(undefined);operation.current=undefined;}}
 };
 const commit=async()=>{
  const snapshot=validated.current;if(!snapshot||snapshot.revision!==revision.current||snapshot.columns!==columns||snapshot.adapter!==adapter||snapshot.validate!==validate||snapshot.maxRows!==maxRows||snapshot.maxFileBytes!==maxFileBytes||step!==3||invalid||commitFlight.current||issues.some(issue=>issue.severity==='error')||(issues.some(issue=>issue.severity==='warning')&&!ack))return;
  setCommitError('');commitFlight.current=true;const controller=new AbortController(),token=revision.current;operation.current=controller;setBusy('commit');setStatus(strings.committing);
  try{const result=await onCommit(snapshot.rows,{signal:controller.signal});if(!alive.current||controller.signal.aborted||token!==revision.current)return;
   if(result.status==='success'){setComplete(true);setStatus(strings.complete);setIssues([]);}
   else{setIssues(copyIssues(result.issues));setStep(2);setAck(false);setStatus('');if(result.issues.length)setFocusVersion(value=>value+1);}
  }catch{if(alive.current&&!controller.signal.aborted&&token===revision.current){setCommitError(strings.failure);setFocusVersion(value=>value+1);setStatus('');}}
  finally{commitFlight.current=false;if(alive.current&&!controller.signal.aborted&&token===revision.current){setBusy(undefined);operation.current=undefined;}}
 };
 const cancel=()=>{const mutation=busy==='commit';invalidate();setIssues([]);setStatus(mutation?strings.stopped:'');if(busy==='parse'){setWorkbook(undefined);setStep(0);}else if(workbook)setStep(1);};
 const linkTarget=(issue:RowIssue)=>{const column=columns.some(column=>column.key===issue.column)?issue.column:undefined;return commitError?id+'-commit':step===0?id+'-file':step===1||issue.row===1?(column?id+'-mapping-'+column:id+'-sheet'):column?id+'-cell-'+issue.row+'-'+column:id+'-row-'+issue.row;};
 if(invalid)return <div ref={ref} className={cx('nova-import-wizard',className)} style={style} data-testid={testId} data-nova-config-error="NOVA_IMPORT_INVALID_CONFIGURATION"><div role="alert">{strings.invalid}</div></div>;
 return <div ref={ref} className={cx('nova-import-wizard',className)} style={style} data-testid={testId} aria-busy={busy!==undefined}>
  <Stepper label={strings.workflow} steps={[strings.choose,strings.mapping,strings.review,strings.confirm].map((label,index)=>({id:String(index),label,status:index<step||complete?'complete':'pending'}))} value={String(step)} onValueChange={()=>{}}/>
  <div role="status" aria-live="polite">{status}</div>
  {step===0&&<div id={id+'-file'}><FileUpload focusRef={chooserFocus} onFiles={files=>{void choose(files);}} maxFileBytes={maxFileBytes}/></div>}
  {step===1&&workbook&&<ImportMapping id={id} workbook={workbook} sheetIndex={sheetIndex} sheet={sheet} columns={columns} mapping={mapping} issues={issues} locked={busy==='commit'} strings={strings} onSheet={index=>edit(initialMapping(workbook.sheets[index],columns),index)} onMapping={(key,index)=>edit({...mapping,[key]:index})}/>}
  {visibleIssues.length>0&&<div id={id+'-issues'} role="alert" tabIndex={-1} ref={summary} aria-label={strings.issues}><ul>{visibleIssues.map((issue,index)=><li key={index}><a href={'#'+linkTarget(issue)} onClick={event=>{event.preventDefault();if(step===0){chooserFocus.current?.focus();return;}if(!commitError&&issue.row===1&&step>1){invalidate();pendingFocus.current=linkTarget(issue);setStep(1);return;}summary.current?.ownerDocument.getElementById(linkTarget(issue))?.focus();}}>{message(issue.column?strings.issue:strings.rowIssue,{row:issue.row,column:columns.find(column=>column.key===issue.column)?.label??issue.column??'',message:issue.message})}</a></li>)}</ul></div>}
  {(step===2||step===3)&&sheet&&<ImportReview id={id} sheet={sheet} columns={columns} mapping={mapping} strings={strings}/>}
  {step===3&&issues.some(issue=>issue.severity==='warning')&&!complete&&<label className="nova-import-wizard__ack"><input type="checkbox" checked={ack} disabled={busy==='commit'} onChange={event=>setAck(event.currentTarget.checked)}/>{strings.ack}</label>}
  {!complete&&<div className="nova-import-wizard__footer">{step>0&&<Button variant="secondary" disabled={busy==='commit'} onClick={()=>{if(busy==='validate')invalidate();setStep(value=>Math.max(0,value-1));}}>{strings.back}</Button>}{step<3?<Button disabled={busy!==undefined||(step===0&&!workbook)} onClick={()=>{void next();}}>{strings.next}</Button>:<Button id={id+'-commit'} disabled={busy!==undefined||issues.some(issue=>issue.severity==='error')||(issues.some(issue=>issue.severity==='warning')&&!ack)} onClick={()=>{void commit();}}>{strings.commit}</Button>}<Button variant="secondary" onClick={cancel}>{strings.cancel}</Button></div>}
 </div>;
}
