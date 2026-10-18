import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {StrictMode,useEffect,useState} from 'react';
import {useTask,type TaskState} from '../../../src/hooks/task/index.js';
import {TaskProvider} from '../../../src/providers/task/index.js';
import {JobProgress} from '../../../src/components/job-progress/index.js';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Button} from '../../../src/components/button/index.js';
function createTransport(){
 const callbacks=new Set<(state:TaskState<number>)=>void>();let live=0,stops=0,cancels=0,last:(()=>void)|undefined;
 return {
  subscribe:(_id:string,onState:(state:TaskState<number>)=>void)=>{callbacks.add(onState);live++;let done=false;return()=>{if(done)throw Error('duplicate cleanup');done=true;callbacks.delete(onState);live--;stops++;last=()=>onState({id:'job',status:'failed',message:'secret'});};},
  emit:(state:TaskState<number>)=>{for(const callback of callbacks)callback(state);},
  cancel:async()=>{cancels++;return false;},
  counts:()=>({live,stops,cancels}),late:()=>last?.(),
 };
}
function Item({transport,name,locale}:{transport:ReturnType<typeof createTransport>;name:string;locale:string}){
 const task=useTask({id:'job',scopeKey:'account',source:{mode:'stream',subscribe:transport.subscribe},initialState:{id:'job',status:'running',progress:25},cancel:transport.cancel});
 return <section aria-label={name}><JobProgress label={name} state={task.state} connection={task.connection} onCancel={()=>void task.cancel()} onRetry={task.retry}/><output aria-label={name+' state'}>{task.state.status}</output><span lang={locale}> </span></section>;
}
function Scenario(){
 const [transport]=useState(createTransport),[first,setFirst]=useState(true),[second,setSecond]=useState(true),[tick,setTick]=useState(0),[theme,setTheme]=useState<'light'|'dark'>('light'),[locale,setLocale]=useState('en');
 const counts=transport.counts();
 return <NovaProvider locale={locale} theme={theme}><main className="nova-card"><h1>Task contract</h1><TaskProvider>{first?<Item name="First task" transport={transport} locale={locale}/>:null}{second?<Item name="Second task" transport={transport} locale={locale}/>:null}</TaskProvider>
 <Button onClick={()=>{transport.emit({id:'job',status:'succeeded',progress:100,result:0});setTick(tick+1);}}>Server success</Button>
 <Button onClick={()=>{setFirst(false);setTick(tick+1);}}>Remove first</Button><Button onClick={()=>{setSecond(false);setTick(tick+1);}}>Remove second</Button>
 <Button onClick={()=>{transport.late();setTick(tick+1);}}>Late old event</Button><Button onClick={()=>setTick(tick+1)}>Refresh counts</Button>
 <Button onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>Change theme</Button><Button onClick={()=>setLocale(l=>l==='en'?'vi':'en')}>Change language</Button>
 <output aria-label="Live streams">{counts.live}</output><output aria-label="Stopped streams">{counts.stops}</output><output aria-label="Cancel calls">{counts.cancels}</output>
 </main></NovaProvider>;
}
export default Scenario;
export function mount(container:HTMLElement){
 function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <StrictMode><Scenario/></StrictMode>;}
 container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);
 hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});
}
