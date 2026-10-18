'use client';
import type {Ref} from 'react';
import {Button} from '../button/button.js';
import {Breadcrumb} from '../breadcrumb/breadcrumb.js';
import type {Key} from '../../types/index.js';
export type ExplorerStrings={name:string;contents:string;folders:string;all:string;back:string;search:string;list:string;grid:string;file:string;folder:string;nameColumn:string;kindColumn:string;open:string;actions:string;select:string;preview:string;closePreview:string;empty:string;noResults:string;error:string;unknown:string;invalid:string};
export type Trail={key:Key|null;name:string};
export const itemKey=(key:Key)=>JSON.stringify([typeof key,key]);
export function ExplorerToolbar({strings,trail,view,query,onQuery,searchRef,chooserRef}:{strings:ExplorerStrings;trail:readonly Trail[];view:'list'|'grid';query:string;onQuery:(query:string)=>void;searchRef:Ref<HTMLInputElement>;chooserRef:Ref<HTMLButtonElement>}){
  return <div className="nova-file-explorer__toolbar">
    <div className="nova-file-explorer__navigation"><Button variant="ghost" data-explorer-action="back" disabled={trail.length<2}>{strings.back}</Button><Breadcrumb label={strings.folders} items={trail.map((entry,index)=>({id:String(index),label:entry.name,href:'#nova-folder'}))} renderLink={entry=><Button variant="ghost" data-explorer-action="folder" data-explorer-key={trail[Number(entry.id)]!.key===null?'null':itemKey(trail[Number(entry.id)]!.key!)}>{entry.label}</Button>}/><Button ref={chooserRef} className="nova-file-explorer__chooser" variant="secondary" data-explorer-action="chooser">{strings.folders}</Button></div>
    <div className="nova-file-explorer__tools"><label className="nova-file-explorer__search"><span>{strings.search}</span><input type="search" ref={searchRef} value={query} onChange={event=>{if(!event.defaultPrevented)onQuery(event.currentTarget.value);}}/></label><div role="group" aria-label={strings.name}><Button variant="ghost" aria-pressed={view==='list'} data-explorer-action="list">{strings.list}</Button><Button variant="ghost" aria-pressed={view==='grid'} data-explorer-action="grid">{strings.grid}</Button></div></div>
  </div>;
}
