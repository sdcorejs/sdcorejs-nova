import {useEffect,useState} from 'react';
import {createRef,type RefCallback} from 'react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {ImportWizard,type ImportColumn,type RowIssue,type WorkbookAdapter} from '../../../src/components/import-wizard/index.js';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Button} from '../../../src/components/button/index.js';
import '../../../src/styles/components/import-wizard.css';
type Row={name:string;count:number};
const columns:readonly ImportColumn<Row>[]=[{key:'name',label:'Name',parse:cell=>String(cell)},{key:'count',label:'Count',parse:cell=>{const count=Number(cell);if(!Number.isFinite(count))throw Error('private number error');return count;}}];
function fake(){let releaseParse:()=>void=()=>{},releaseValidation:()=>void=()=>{},releaseCommit:()=>void=()=>{};const signals:AbortSignal[]=[];
 const workbook=(name:string)=>({sheets:[{name:'Main',rows:name.includes('duplicate')?[['name','name'],['A',0]]:name.includes('missing')?[['name'],['A']]:name.includes('over')?[['name','count'],['A',0],['B',1],['C',2]]:[['name','count'],[name.replace('.xlsx',''),name.includes('invalid')?'bad number':0]]},{name:'Second',rows:[['name','count'],['second',1]]}]});
 const adapter:WorkbookAdapter={parse:async(file,ctx)=>{signals.push(ctx.signal);if(file.name.includes('deny'))throw Error('private compressed bomb');if(file.name.includes('slow'))await new Promise<void>(resolve=>{releaseParse=resolve;});return workbook(file.name);}};
 const validate=async(rows:readonly Row[],ctx:{signal:AbortSignal}):Promise<readonly RowIssue[]>=>{signals.push(ctx.signal);if(rows[0]?.name.includes('pending'))await new Promise<void>(resolve=>{releaseValidation=resolve;});if(rows[0]?.name.includes('warning'))return [{row:2,column:'name',severity:'warning',message:'Confirm duplicate'}];if(rows[0]?.name.includes('error'))return [{row:2,column:'count',severity:'error',message:'Invalid date'}];return [];};
 const commit=async(rows:readonly Row[],ctx:{signal:AbortSignal})=>{signals.push(ctx.signal);if(rows[0]?.name.includes('reject'))return {status:'rejected' as const,issues:[{row:2,column:'count',severity:'error' as const,message:'Server rejected source cell'}]};await new Promise<void>(resolve=>{releaseCommit=resolve;});return {status:'success' as const};};
 return {adapter,validate,commit,releaseParse:()=>releaseParse(),releaseValidation:()=>releaseValidation(),releaseCommit:()=>releaseCommit(),aborted:()=>signals.filter(signal=>signal.aborted).length};
}
function Scenario(){const [engine]=useState(fake),[calls,setCalls]=useState(0),[aborted,setAborted]=useState(0),[mounted,setMounted]=useState(true),[theme,setTheme]=useState<'light'|'dark'>('light'),[locale,setLocale]=useState<'vi'|'en'>('en');return <NovaProvider locale={locale} theme={theme}><main className="nova-card"><h1>Workbook import</h1>{mounted&&<ImportWizard adapter={engine.adapter} columns={columns} validate={engine.validate} onCommit={async(rows,ctx)=>{setCalls(value=>value+1);return engine.commit(rows,ctx);}} maxRows={2} maxFileBytes={4}/>}<output aria-label="Commit calls">{calls}</output><output aria-label="Aborted operations">{aborted}</output><Button size="lg" onClick={engine.releaseParse}>Release parse</Button><Button size="lg" onClick={engine.releaseValidation}>Release validation</Button><Button size="lg" onClick={engine.releaseCommit}>Release commit</Button><Button size="lg" onClick={()=>setAborted(engine.aborted())}>Inspect aborts</Button><Button size="lg" onClick={()=>setMounted(value=>!value)}>Toggle wizard</Button><Button size="lg" onClick={()=>setTheme(value=>value==='light'?'dark':'light')}>Change theme</Button><Button size="lg" onClick={()=>setLocale(value=>value==='en'?'vi':'en')}>Change language</Button></main></NovaProvider>;}
export default Scenario;
export function mount(container:HTMLElement){if(new URL(location.href).searchParams.has('root-ref')){mountRootRef(container);return;}function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <Scenario/>;}container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});}

function rootRefProbe(container:HTMLElement){
 const events:string[]=[],signals:AbortSignal[]=[],object=createRef<HTMLDivElement>();
 let first:HTMLDivElement|null=null,parseRelease=()=>{},validationRelease=()=>{},commitRelease=()=>{};
 let parseCalls=0,validationCalls=0,commitCalls=0,validated:readonly Row[]|undefined;
 const publish=()=>{container.dataset.refObjectCleared=String(object.current===null);container.dataset.refObject=String(object.current!==null&&object.current===container.querySelector('.nova-import-wizard'));container.dataset.refEvents=events.join(',');container.dataset.refParseCalls=String(parseCalls);container.dataset.refValidationCalls=String(validationCalls);container.dataset.refCommitCalls=String(commitCalls);container.dataset.refAborted=String(signals.filter(signal=>signal.aborted).length);};
 const attach=(label:string,node:HTMLDivElement)=>{events.push(label+':attach');first??=node;container.dataset.refSameRoot=String(first===node);container.dataset.refActualRoot=String(node.tagName==='DIV'&&node.classList.contains('nova-import-wizard'));node.dataset.refProbe=label;publish();};
 const a:RefCallback<HTMLDivElement>=node=>{if(node){attach('a',node);return ()=>{events.push('a:cleanup');publish();};}};
 const b:RefCallback<HTMLDivElement>=node=>{if(node){attach('b',node);return ()=>{events.push('b:cleanup');publish();};}};
 const legacy:RefCallback<HTMLDivElement>=node=>{if(node)attach('legacy',node);else{events.push('legacy:null');publish();}};
 const adapter:WorkbookAdapter={parse:async(file,ctx)=>{parseCalls++;signals.push(ctx.signal);publish();if(file.name.includes('deny'))throw Error('private');await new Promise<void>(resolve=>{parseRelease=resolve;});return {sheets:[{name:'Main',rows:[['name','count'],[file.name,0]]}]};}};
 const validate=async(rows:readonly Row[],ctx:{signal:AbortSignal}):Promise<readonly RowIssue[]>=>{validationCalls++;validated=rows;signals.push(ctx.signal);publish();await new Promise<void>(resolve=>{validationRelease=resolve;});return rows[0]!.name.includes('error')?[{row:2,column:'count',severity:'error',message:'Ref cell issue'}]:[];};
 const onCommit=async(rows:readonly Row[],ctx:{signal:AbortSignal})=>{commitCalls++;signals.push(ctx.signal);container.dataset.refSameSnapshot=String(rows===validated&&rows[0]===validated?.[0]);publish();await new Promise<void>(resolve=>{commitRelease=resolve;});return {status:'success' as const};};
 return {a,b,legacy,object,adapter,validate,onCommit,publish,releaseParse:()=>parseRelease(),releaseValidation:()=>validationRelease(),releaseCommit:()=>commitRelease()};
}
function RootRefScenario({container}:{container:HTMLElement}){
 const [probe]=useState(()=>rootRefProbe(container)),[kind,setKind]=useState<'a'|'b'|'legacy'|'object'>('a'),[mounted,setMounted]=useState(true),[invalid,setInvalid]=useState(false),[tick,setTick]=useState(0);
 useEffect(()=>{probe.publish();},[probe,kind,mounted,invalid,tick]);
 return <NovaProvider locale="en"><main className="nova-card"><h1>Root ref import</h1>{mounted&&<ImportWizard ref={probe[kind]} adapter={probe.adapter} columns={columns} validate={probe.validate} onCommit={probe.onCommit} maxRows={invalid?0:2} maxFileBytes={4} data-testid="ref-wizard"/>}<output aria-label="Ref rerenders">{tick}</output><Button onClick={()=>setTick(value=>value+1)}>Rerender ref consumer</Button><Button onClick={()=>setKind('b')}>Use cleanup ref B</Button><Button onClick={()=>setKind('legacy')}>Use legacy ref</Button><Button onClick={()=>setKind('object')}>Use object ref</Button><Button onClick={()=>setMounted(value=>!value)}>Toggle ref wizard</Button><Button onClick={()=>setInvalid(value=>!value)}>Toggle invalid config</Button><Button onClick={probe.releaseParse}>Release ref parse</Button><Button onClick={probe.releaseValidation}>Release ref validation</Button><Button onClick={probe.releaseCommit}>Release ref commit</Button></main></NovaProvider>;
}
function mountRootRef(container:HTMLElement){
 function HydratedRef(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <RootRefScenario container={container}/>;}
 container.dataset.hydration='pending';container.dataset.recoverableErrors='0';
 container.innerHTML=renderToString(<HydratedRef/>);
 hydrateRoot(container,<HydratedRef/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});
}
