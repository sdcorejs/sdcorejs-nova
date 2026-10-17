import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {useEffect,useRef,useState} from 'react';
import {ColorInput} from '../../../src/components/color-input/index.js';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Button} from '../../../src/components/button/index.js';
function Scenario(){
 const [theme,setTheme]=useState<'light'|'dark'>('light'),[value,setValue]=useState<string|null>(null),[proposals,setProposals]=useState(0);
 return <NovaProvider locale="en" theme={theme}><main className="nova-card"><h1>Color contract</h1><Button onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>Change theme</Button><ColorInput label="Brand" value={value} onValueChange={next=>{setValue(next);setProposals(n=>n+1);}}/><ColorInput label="Alpha" alpha defaultValue="#11223380"/><ColorInput label="Consumer owned" value="#112233" onValueChange={()=>setProposals(n=>n+1)}/><ColorInput label="Read only" readOnly defaultValue="#112233"/><output aria-label="Value">{value??'null'}</output><output aria-label="Proposals">{proposals}</output></main></NovaProvider>;
}
function RefScenario(){
 const root=useRef<HTMLElement>(null),focus=useRef<HTMLElement>(null),[proposals,setProposals]=useState(0);
 return <NovaProvider locale="en"><main><h1>Consumer ref focus</h1><Button onClick={()=>{if(root.current?.contains(focus.current))focus.current?.focus();}}>Focus ref color</Button><form aria-label="Ref form"><ColorInput label="Ref color" ref={root} focusRef={focus} name="color" defaultValue="#112233" onValueChange={()=>setProposals(n=>n+1)}/><button type="reset">Reset ref color</button></form><output aria-label="Ref proposals">{proposals}</output></main></NovaProvider>;
}
export default Scenario;
export function mount(container:HTMLElement){
 const Content=new URLSearchParams(window.location.search).has('ref-case')?RefScenario:Scenario;
 function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <Content/>;}
 container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);
 hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});
}
