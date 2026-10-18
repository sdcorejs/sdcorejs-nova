import {useEffect,useState} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {FileUpload} from '../../../src/components/file-upload/index.js';
import {useFileTransfer,type TransferAdapter} from '../../../src/hooks/file-transfer/index.js';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Button} from '../../../src/components/button/index.js';
import {Progress} from '../../../src/components/data-state/progress.js';
function transport(){
 const jobs:Array<{resolve:(value:{id:string})=>void;reject:(reason:Error)=>void;progress:(loaded:number,total?:number)=>void}>=[];
 const adapter:TransferAdapter={upload:(_file,ctx)=>new Promise((resolve,reject)=>{jobs.push({resolve,reject,progress:ctx.onProgress});}),download:async request=>request.id==='blob'?new Blob(['caller-owned bytes']):undefined};
 return {adapter,complete:()=>jobs.forEach(job=>{job.progress(9,10);job.resolve({id:'remote'});}),fail:()=>jobs[0]?.reject(Error('secret source stack')),progress:()=>jobs.forEach(job=>job.progress(1,2))};
}
function TransferPanel(){
 const [source]=useState(transport),[disabled,setDisabled]=useState(false),[received,setReceived]=useState('none');const transfer=useFileTransfer({adapter:source.adapter});
 return <><FileUpload accept=".txt" multiple maxFileBytes={4} disabled={disabled} onFiles={transfer.enqueue}/><Button size="lg" onClick={()=>setDisabled(value=>!value)}>Toggle disabled</Button><Button size="lg" onClick={source.complete}>Release transfers</Button><Button size="lg" onClick={source.fail}>Fail first</Button><Button size="lg" onClick={source.progress}>Report progress</Button>
 <Button size="lg" onClick={()=>{void transfer.download({id:'blob',name:'Blob result'}).then(blob=>setReceived(blob?'Blob received by application':'no Blob'));}}>Download Blob</Button><Button size="lg" onClick={()=>{void transfer.download({id:'handoff',name:'Browser result'}).then(()=>setReceived('adapter handoff'));}}>Download handoff</Button><output aria-label="Download receiver">{received}</output>
 <ul aria-label="Transfers">{transfer.items.map(item=><li key={item.id}><span>{item.name}</span><output aria-label={'State '+item.name}>{item.statusMessage??item.errorMessage??item.status}</output>{item.status==='running'&&<Progress label={'Progress '+item.name} value={item.progress}/>}<Button size="lg" disabled={item.status!=='running'&&item.status!=='queued'} onClick={()=>transfer.cancel(item.id)}>Cancel {item.name}</Button><Button size="lg" disabled={item.status!=='error'&&item.status!=='cancelled'} onClick={()=>transfer.retry(item.id)}>Retry {item.name}</Button></li>)}</ul></>;
}
function Scenario(){const [theme,setTheme]=useState<'light'|'dark'>('light'),[mounted,setMounted]=useState(true);return <NovaProvider locale="en" theme={theme}><main className="nova-card"><h1>File transfers</h1>{mounted&&<TransferPanel/>}<Button size="lg" onClick={()=>setMounted(value=>!value)}>Toggle transfer panel</Button><Button size="lg" onClick={()=>setTheme(value=>value==='light'?'dark':'light')}>Change theme</Button></main></NovaProvider>;}
export default Scenario;
export function mount(container:HTMLElement){function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return new URLSearchParams(location.search).has('preview')?<PreviewScenario/>:new URLSearchParams(location.search).has('focus-ref')?<FocusRefScenario/>:<Scenario/>;}container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});}

import {useRef} from 'react';
function FocusRefScenario(){
 const focus=useRef<HTMLElement>(null),root=useRef<HTMLDivElement>(null),[target,setTarget]=useState('none'),[rootTarget,setRootTarget]=useState('none'),[files,setFiles]=useState('none');
 return <NovaProvider locale="en"><main className="nova-card"><h1>Upload validation focus</h1><FileUpload ref={root} focusRef={focus} onFiles={selected=>setFiles(selected.map(file=>file.name).join(','))}/><Button size="lg" onClick={()=>{focus.current?.focus();setTarget(focus.current?.tagName??'missing');setRootTarget(root.current?.tagName??'missing');}}>Focus upload control</Button><output aria-label="Focus target">{target}</output><output aria-label="Root target">{rootTarget}</output><output aria-label="Selected files">{files}</output></main></NovaProvider>;
}

class PreviewProbe {created:string[]=[];revoked:string[]=[];saved?:ReturnType<typeof useFileTransfer>;oldId?:string;caller?:string;setSaved(transfer:ReturnType<typeof useFileTransfer>){this.saved=transfer;}setOld(id:string){this.oldId=id;}setCaller(url:string){this.caller=url;}}
function PreviewScenario(){
 const [probe]=useState(()=>new PreviewProbe()),[shown,setShown]=useState(true),[stale,setStale]=useState('none'),[caller,setCaller]=useState<string>();
 useEffect(()=>{const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);probe.created.push(url);return url;};URL.revokeObjectURL=url=>{probe.revoked.push(url);revoke(url);};(globalThis as typeof globalThis & {u01Preview?:PreviewProbe}).u01Preview=probe;return ()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;if(probe.caller)revoke(probe.caller);};},[probe]);
 return <NovaProvider locale="en"><main><h1>Owned upload previews</h1>{shown&&<PreviewPanel probe={probe}/>}<button onClick={()=>setShown(value=>!value)}>Toggle preview owner</button><button onClick={()=>{void probe.saved?.preview(probe.oldId??'missing').then(url=>setStale(url??'empty'));}}>Retained preview request</button><output aria-label="Retained preview">{stale}</output><button onClick={()=>{const url=URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'],{type:'image/svg+xml'}));probe.setCaller(url);setCaller(url);}}>Create caller preview</button>{caller&&<img alt="Caller preview" src={caller}/>}</main></NovaProvider>;
}
function PreviewPanel({probe}:{probe:PreviewProbe}){
 const [adapter]=useState<TransferAdapter>(()=>({upload:async()=>({id:'remote'})})),transfer=useFileTransfer({adapter}),[url,setUrl]=useState<string>();
 useEffect(()=>{probe.setSaved(transfer);},[probe,transfer]);
 return <><button onClick={()=>transfer.enqueue([new File(['<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'],'native.svg',{type:'image/svg+xml'})])}>Queue preview file</button><button onClick={()=>{const id=transfer.items[0]?.id;if(id){probe.setOld(id);void transfer.preview(id).then(setUrl);}}}>Show upload preview</button><button onClick={()=>{transfer.clear();setUrl(undefined);}}>Clear preview queue</button><output aria-label="Preview queue count">{transfer.items.length}</output>{url&&<img alt="Upload preview" src={url}/>}</>;
}
