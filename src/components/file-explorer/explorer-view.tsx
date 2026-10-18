'use client';
import type {ReactNode} from 'react';
import {Button} from '../button/button.js';
import {Checkbox} from '../checkbox/checkbox.js';
import {ActionMenu} from '../action-menu/action-menu.js';
import {DataTable,type Column} from '../data-table/data-table.js';
import type {Key,MenuAction} from '../../types/index.js';
import type {ExplorerItem} from './file-explorer.js';
import {itemKey,type ExplorerStrings} from './explorer-toolbar.js';
export function ExplorerView<T>({items,view,columns,actions,renderGridItem,preview,selectedKeys,onSelectedKeysChange,strings}:{items:readonly ExplorerItem<T>[];view:'list'|'grid';columns?:readonly Column<T>[];actions?:readonly MenuAction<T>[];renderGridItem?:(data:T)=>ReactNode;preview:boolean;selectedKeys?:readonly Key[];onSelectedKeysChange?:(keys:readonly Key[])=>void;strings:ExplorerStrings}){
  const selection=selectedKeys!==undefined&&onSelectedKeysChange!==undefined;
  const open=(item:ExplorerItem<T>)=><Button variant="ghost" data-explorer-action="open" data-explorer-key={itemKey(item.key)} aria-label={strings.open.replaceAll('{name}',item.name)}>{item.name}</Button>;
  const controls=(item:ExplorerItem<T>)=><>{actions?.length?<span data-explorer-focus="menu" data-explorer-key={itemKey(item.key)}><ActionMenu actions={actions} data={item.data} label={strings.actions.replaceAll('{name}',item.name)}/></span>:null}{preview&&item.kind==='file'?<Button variant="ghost" data-explorer-action="preview" data-explorer-key={itemKey(item.key)} aria-label={strings.preview.replaceAll('{name}',item.name)}>{strings.preview.replaceAll('{name}',item.name)}</Button>:null}</>;
  // Private structural IDs never use consumer IDs, including name/kind.
  const projected:Column<ExplorerItem<T>>[]=[{id:'0',header:strings.nameColumn,cell:open},...(columns?.map((column,index)=>({id:String(index+1),header:column.header,cell:(item:ExplorerItem<T>)=>column.cell(item.data),...(column.minWidth===undefined?{}:{minWidth:column.minWidth})}))??[{id:'1',header:strings.kindColumn,cell:(item:ExplorerItem<T>)=>item.kind==='file'?strings.file:strings.folder}]),{id:'controls',header:strings.actions.replaceAll('{name}','').trim(),cell:controls}];
  if(view==='grid')return <ul className="nova-file-explorer__grid" aria-label={strings.name}>{items.map(item=><li key={itemKey(item.key)} data-explorer-row={itemKey(item.key)} className="nova-file-explorer__card">{selection?<Checkbox aria-label={strings.select.replaceAll('{name}',item.name)} value={selectedKeys.includes(item.key)} onValueChange={()=>onSelectedKeysChange(selectedKeys.includes(item.key)?selectedKeys.filter(key=>key!==item.key):[...selectedKeys,item.key])}/>:null}{open(item)}{renderGridItem?renderGridItem(item.data):<span>{item.kind==='file'?strings.file:strings.folder}</span>}{controls(item)}</li>)}</ul>;
  // D01 has no selection-off mode. Default D05 uses a native table; opt-in
  // selection composes D01 without inventing local sorting or paging policy.
  if(selection)return <DataTable rows={items} getRowKey={item=>item.key} columns={projected} state={{page:{pageIndex:0,pageSize:Math.max(1,items.length)},sort:[],selectedKeys}} onStateChange={next=>onSelectedKeysChange(next.selectedKeys)} total={items.length} caption={strings.contents}/>;
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Named overflow region provides native keyboard scroll access.
  return <div className="nova-file-explorer__scroll" role="region" aria-label={strings.contents} tabIndex={0}><table className="nova-file-explorer__table"><caption>{strings.contents}</caption><thead><tr>{projected.map(column=><th key={column.id} scope="col">{column.header}</th>)}</tr></thead><tbody>{items.map(item=><tr key={itemKey(item.key)}>{projected.map(column=><td key={column.id}>{column.cell(item)}</td>)}</tr>)}</tbody></table></div>;
}
