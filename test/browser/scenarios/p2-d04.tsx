import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tree } from '../../../src/components/tree/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';
type Node={id:number|string;label:string;branch?:boolean};
const roots:readonly Node[]=[{id:0,label:'Root',branch:true},{id:'0',label:'String zero'}],child:Node={id:'child',label:'Child',branch:true};
function Scenario(){
  const [expanded,setExpanded]=useState<readonly Node['id'][]>([]),[selected,setSelected]=useState<readonly Node['id'][]>([]),[scope,setScope]=useState('a'),[mounted,setMounted]=useState(true),[reads,setReads]=useState(0),[aborts,setAborts]=useState(0),[action,setAction]=useState('');
  const pending=useRef<{resolve:(items:readonly Node[])=>void;reject:()=>void}[]>([]);
  const load=useCallback((_item:Node,{signal}:{signal:AbortSignal})=>{
    setReads(value=>value+1); signal.addEventListener('abort',()=>setAborts(value=>value+1),{once:true});
    return new Promise<readonly Node[]>((resolve,reject)=>pending.current.push({resolve,reject:()=>reject(new Error('private error'))}));
  },[]);
  return <NovaProvider locale="en"><main><h1>Tree contract</h1><button onClick={()=>setScope(value=>value==='a'?'b':'a')}>Change scope</button><button onClick={()=>setMounted(value=>!value)}>Toggle tree</button><button onClick={()=>pending.current.shift()?.resolve([child])}>Resolve oldest</button><button onClick={()=>pending.current.shift()?.reject()}>Fail oldest</button><button onClick={()=>setExpanded([])}>Collapse externally</button>{mounted?<Tree aria-label="Files" scopeKey={scope} source={{mode:'lazy',roots:[...roots],hasChildren:n=>!!n.branch,loadChildren:load}} getKey={n=>n.id} getLabel={n=>n.label} expandedKeys={expanded} onExpandedKeysChange={setExpanded} selectedKeys={selected} onSelectedKeysChange={setSelected} actions={[{id:'inspect',label:'Inspect',onAction:n=>setAction(`${typeof n.id}:${n.id}`)}]}/>:null}<output aria-label="Reads">{reads}</output><output aria-label="Aborts">{aborts}</output><output aria-label="Selected">{JSON.stringify(selected)}</output><output aria-label="Action">{action}</output></main></NovaProvider>;
}
export default Scenario;
export function mount(container:HTMLElement){
  function Hydrated(){useEffect(()=>{if(container.dataset.hydration!=='failed')container.dataset.hydration='complete';},[]);return <Scenario/>;}
  container.dataset.hydration='pending';container.dataset.recoverableErrors='0';container.innerHTML=renderToString(<Hydrated/>);
  hydrateRoot(container,<Hydrated/>,{onRecoverableError:()=>{container.dataset.hydration='failed';container.dataset.recoverableErrors=String(Number(container.dataset.recoverableErrors)+1);}});
}
