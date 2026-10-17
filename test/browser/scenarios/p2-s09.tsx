import {useEffect,useLayoutEffect,useState} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {useStoredState,type StorageAdapter} from '../../../src/hooks/stored-state/index.js';
import {createLocalStorageAdapter} from '../../../src/adapters/storage/index.js';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Button} from '../../../src/components/button/index.js';
const storageKey=JSON.stringify(['nova','browser-owner','preferences']);
function transport(){
 const base=createLocalStorageAdapter();const reads:(()=>void)[]=[];const writes:(()=>void)[]=[];let open=false;
 const adapter:StorageAdapter={read:key=>{const bytes=base.read(key);return new Promise(resolve=>{reads.push(()=>{void bytes.then(resolve);});});},write:async(key,value)=>{if(!open)await new Promise<void>(resolve=>writes.push(resolve));await base.write(key,value);},remove:base.remove};
 return {adapter,releaseReads:()=>{for(const resolve of reads.splice(0))resolve();},releaseWrites:()=>{open=true;for(const resolve of writes.splice(0))resolve();},readStored:()=>base.read(storageKey)};
}
function Scenario(){
 const [source]=useState(transport),[stored,setStored]=useState('unread'),[theme,setTheme]=useState<'light'|'dark'>('light');
 const state=useStoredState({key:'preferences',scopeKey:'browser-owner',version:1,initial:1,adapter:source.adapter,encode:String,decode:value=>{const number=Number(value);if(!Number.isFinite(number))throw Error('invalid');return number;}});
 const {setValue}=state;
 useLayoutEffect(()=>{setValue(0);},[setValue]);
 return <NovaProvider locale="en" theme={theme}><main className="nova-card"><h1>Stored preferences</h1><output aria-label="Current preference">{state.value}</output><output aria-label="Persistence status">{state.status}</output><output aria-label="Stored bytes">{stored}</output>
 <Button size="lg" onClick={()=>state.setValue(2)}>Set two</Button><Button size="lg" onClick={()=>{void state.reset();}}>Reset preferences</Button><Button size="lg" onClick={source.releaseReads}>Release stale read</Button><Button size="lg" onClick={source.releaseWrites}>Release started write</Button><Button size="lg" onClick={()=>{void source.readStored().then(value=>setStored(value??'missing'));}}>Read stored bytes</Button><Button size="lg" onClick={()=>setTheme(value=>value==='light'?'dark':'light')}>Change theme</Button>
 </main></NovaProvider>;
}
export default Scenario;
export function mount(container:HTMLElement){
 function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <Scenario/>;}
 container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);
 localStorage.setItem(storageKey,JSON.stringify({version:1,payload:'99'}));
 hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});
}
