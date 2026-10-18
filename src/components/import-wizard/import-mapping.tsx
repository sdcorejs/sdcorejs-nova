'use client';
import {Field} from '../field/field.js';
import {headers,message,type ImportStrings,type Workbook,type Sheet} from './import-model.js';
export type MappingColumn={key:string;label:string};
export function ImportMapping({id,workbook,sheetIndex,sheet,columns,mapping,issues,locked,strings,onSheet,onMapping}:{id:string;workbook:Workbook;sheetIndex:number;sheet:Sheet|undefined;columns:readonly MappingColumn[];mapping:Readonly<Record<string,number>>;issues:readonly {column?:string}[];locked:boolean;strings:ImportStrings;onSheet:(index:number)=>void;onMapping:(key:string,index:number)=>void}){
 return <div className="nova-import-wizard__mapping"><Field id={id+'-sheet'} label={strings.sheet}><select id={id+'-sheet'} value={sheetIndex} disabled={locked} onChange={event=>onSheet(Number(event.currentTarget.value))}>{workbook.sheets.map((item,index)=><option key={index} value={index}>{item.name}</option>)}</select></Field>
 {columns.map(column=><div key={column.key}><label htmlFor={id+'-mapping-'+column.key}>{message(strings.source,{column:column.label})}</label><select id={id+'-mapping-'+column.key} value={mapping[column.key]??-1} disabled={locked} aria-invalid={issues.some(issue=>issue.column===column.key)||undefined} aria-describedby={issues.some(issue=>issue.column===column.key)?id+'-issues':undefined} onChange={event=>onMapping(column.key,Number(event.currentTarget.value))}><option value={-1}>{strings.unmapped}</option>{headers(sheet).map((header,index)=><option key={index} value={index}>{header}</option>)}</select></div>)}</div>;
}
