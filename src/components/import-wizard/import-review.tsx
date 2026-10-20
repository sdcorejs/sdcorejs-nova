'use client';
import {DataTable} from '../data-table/data-table.js';
import type {TableState} from '../data-table/data-table-model.js';
import type {MappingColumn} from './import-mapping.js';
import type {ImportStrings,Sheet} from './import-model.js';
const state:TableState<number>={page:{pageIndex:0,pageSize:10},sort:[],selectedKeys:[]};
function display(cell:unknown,strings:ImportStrings){return cell===null||cell===undefined||cell===''?strings.empty:typeof cell==='string'||typeof cell==='number'||typeof cell==='boolean'?String(cell):strings.object;}
export function ImportReview({id,sheet,columns,mapping,strings}:{id:string;sheet:Sheet;columns:readonly MappingColumn[];mapping:Readonly<Record<string,number>>;strings:ImportStrings}){
 const rows=sheet.rows.slice(1).map((cells,index)=>({cells,source:index+2}));
 return <DataTable pageSizeOptions={[]} rows={rows} getRowKey={row=>row.source} state={{...state,page:{pageIndex:0,pageSize:Math.max(1,rows.length)}}} onStateChange={()=>{}} isRowSelectable={()=>false} total={rows.length} caption={strings.caption} columns={[{id:'source-index',header:strings.row,cell:row=><span id={id+'-row-'+row.source} tabIndex={-1}>{row.source}</span>},...columns.map((column,index)=>({id:'mapped-'+index,header:column.label,cell:(row:typeof rows[number])=><span id={id+'-cell-'+row.source+'-'+column.key} tabIndex={-1}>{display(row.cells[mapping[column.key]!],strings)}</span>}))]}/>;
}
