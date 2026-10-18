import {createRef,type Ref} from 'react';
// case-p2-d05-ac01-types public fixture; root/subpath packed proof belongs TASK030.
import {FileExplorer as RootExplorer} from '@sdcorejs/nova';
import {FileExplorer,type ExplorerItem,type FileExplorerProps} from '@sdcorejs/nova/file-explorer';
type Raw={id:number;title:string};
const roots:readonly ExplorerItem<Raw>[]=[{key:0,name:'Archive',kind:'folder',data:{id:1,title:'Archive'}}];
const props:FileExplorerProps<Raw>={scopeKey:'a',roots,folderKey:0,onFolderChange:key=>{const typed:string|number|null=key;void typed;},loadChildren:async(folder,{signal})=>{const raw:Raw|undefined=folder?.data;void raw;signal.throwIfAborted();return roots;},onOpen:raw=>{const typed:Raw=raw;void typed;},columns:[{id:'name',header:'Custom name',cell:raw=>raw.title},{id:'kind',header:'Custom kind',cell:raw=>raw.id}],renderGridItem:raw=>raw.title,renderPreview:raw=>raw.title,actions:[{id:'inspect',label:'Inspect',onAction:raw=>{const typed:Raw=raw;void typed;}}]};
const ref=createRef<HTMLElement>(),callback:Ref<HTMLElement>=node=>{node?.focus();return()=>{};};
export const positive=<><RootExplorer {...props} ref={ref} id="root" tabIndex={0} aria-describedby="hint" onClick={event=>event.preventDefault()}/><FileExplorer {...props} ref={callback} view="grid" onViewChange={()=>{}} selectedKeys={[0,'0']} onSelectedKeysChange={()=>{}} search={async({query,folderKey,signal})=>{void query;void folderKey;signal.throwIfAborted();return roots;}}/></>;
// @ts-expect-error Controlled view requires callback.
export const viewCallback=<FileExplorer {...props} view="grid"/>;
// @ts-expect-error Selection is an explicit paired opt-in.
export const selectedWithoutCallback=<FileExplorer {...props} selectedKeys={[]}/>;
// @ts-expect-error Selection callback is paired with controlled keys.
export const callbackWithoutSelected=<FileExplorer {...props} onSelectedKeysChange={()=>{}}/>;
// @ts-expect-error Folder state belongs to consumer and is required.
export const noFolder=<FileExplorer scopeKey="a" roots={roots} onFolderChange={()=>{}} loadChildren={async()=>[]}/>;
// @ts-expect-error Raw callback never receives ExplorerItem wrapper or string.
export const rawOpen=<FileExplorer {...props} onOpen={(raw:string)=>{void raw;}}/>;
// @ts-expect-error No business disabled state added.
export const disabled=<FileExplorer {...props} disabled/>;
// @ts-expect-error No Field contract invented.
export const field=<FileExplorer {...props} nameFromField/>;
// @ts-expect-error No value contract invented.
export const value=<FileExplorer {...props} value={[]}/>;
// @ts-expect-error No hidden alternate focus target.
export const focusRef=<FileExplorer {...props} focusRef={ref}/>;
// @ts-expect-error Generated busy semantics are protected.
export const busy:FileExplorerProps<Raw>={...props,'aria-busy':false};
// @ts-expect-error Native semantic role cannot be replaced.
export const role:FileExplorerProps<Raw>={...props,role:'grid'};
