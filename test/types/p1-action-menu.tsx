import { ActionMenu, QuickActions } from '@sdcorejs/nova/action-menu';
import type { MenuAction } from '@sdcorejs/nova/types';
const data={id:1,title:'Draft'};
const actions:readonly MenuAction<typeof data>[]=[{id:'rename',label:'Rename',onAction:raw=>{const title:string=raw.title;void title;}},{id:'group',label:'Export',children:[{id:'download',label:'Download',onAction:async raw=>{const id:number=raw.id;void id;}}]}];
const menu=<ActionMenu data={data} label="Actions" actions={actions} onActionError={(error,id)=>{const key:string=id;const cause:unknown=error;void [key,cause];}}/>;
const quick=<QuickActions data={data} label="More" actions={actions} disabled/>;
void [menu,quick];
// @ts-expect-error menu triggers need an accessible name
<ActionMenu data={data} actions={actions}/>;
// @ts-expect-error business data remains the consumer's original shape
<ActionMenu data={data} label="Actions" actions={[{id:'bad',label:'Bad',onAction:(value:string)=>{void value;}}]}/>;
// @ts-expect-error action groups contain only leaf actions, never recursive groups
const deep:MenuAction<typeof data>={id:'group',label:'Group',children:[{id:'nested',label:'Nested',children:[]}]};
// @ts-expect-error action callbacks resolve void rather than returning replacement business values
const result:MenuAction<typeof data>={id:'save',label:'Save',onAction:async()=>data};
void [deep,result];
