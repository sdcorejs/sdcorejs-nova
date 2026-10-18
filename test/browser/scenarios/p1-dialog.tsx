import { useState } from 'react';
import { NovaProvider } from '../../../src/providers/nova/index.js';
import { Dialog } from '../../../src/components/dialog/index.js';
import { Popover } from '../../../src/components/popover/index.js';
export default function DialogScenario(){
  const [open,setOpen]=useState(false),[actions,setActions]=useState(0);
  return <NovaProvider locale="en"><div style={{position:'fixed',top:'30%',left:'35%'}}><Popover label="Parent tools" trigger={<button>Open tools</button>} style={{width:300,height:220}}><button onClick={()=>setOpen(true)}>Open dialog</button><Dialog title="Child dialog" value={open} onValueChange={setOpen}><button onClick={()=>setActions(count=>count+1)}>Child action</button><output aria-label="Child actions">{actions}</output><p>Dialog above its anchored parent.</p></Dialog></Popover></div></NovaProvider>;
}
