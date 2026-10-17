import {parseISODate} from '../lib/civil-date.js';
import type {FilterField,FilterValue} from './filter-types.js';
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
/** Indexed reads deliberately reject sparse slots; array iteration helpers skip holes. */
function dense(value:unknown,predicate:(entry:unknown)=>boolean):value is readonly unknown[]{if(!Array.isArray(value))return false;for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i)||!predicate(value[i]))return false;}return true;}
function nonempty(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
export function validFilterFields(fields:unknown):fields is readonly FilterField[]{
 if(!dense(fields,field=>record(field)&&nonempty(field.id)&&nonempty(field.label)&&typeof field.kind==='string'&&['text','number','boolean','date','choice'].includes(field.kind)&&dense(field.operators,nonempty)&&field.operators.length>0&&new Set(field.operators).size===field.operators.length&&(field.comparisonGroup===undefined||nonempty(field.comparisonGroup))))return false;
 return new Set(fields.map(field=>(field as FilterField).id)).size===fields.length;
}
export function validFilterValue(field:FilterField,value:unknown):value is FilterValue{
 if(value===null)return true;
 switch(field.kind){case 'text':return typeof value==='string';case 'number':return typeof value==='number'&&Number.isFinite(value);case 'boolean':return typeof value==='boolean';case 'date':return typeof value==='string'&&parseISODate(value)!==null;case 'choice':return dense(value,key=>typeof key==='string'||typeof key==='number'&&Number.isFinite(key));default:return false;}
}
export function validateFilterRules(fields:unknown,rules:unknown):{ok:boolean;invalidIndexes:readonly number[]}{
 if(!validFilterFields(fields)||!Array.isArray(rules))return {ok:false,invalidIndexes:[]};
 const invalidIndexes:number[]=[];
 for(let i=0;i<rules.length;i++){const rule:unknown=rules[i];if(!Object.hasOwn(rules,i)||!record(rule)){invalidIndexes.push(i);continue;}const field=fields.find(item=>item.id===rule.fieldId);if(!field||typeof rule.operator!=='string'||!field.operators.includes(rule.operator)||!validFilterValue(field,rule.value))invalidIndexes.push(i);}
 return {ok:invalidIndexes.length===0,invalidIndexes};
}
/** Field comparison is opt-in in the builder; metadata only determines compatibility. */
export function compatibleFilterFields(a:FilterField,b:FilterField):boolean{return validFilterFields([a])&&validFilterFields([b])&&a.kind===b.kind&&a.comparisonGroup===b.comparisonGroup;}

const decimalPattern=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/u;
function decimalIdentity(raw:string):string|undefined{const match=decimalPattern.exec(raw);if(!match)return;const fraction=match[3]??'';const digits=(match[2]!+fraction).replace(/^0+/u,'');if(!digits)return '0';const significant=digits.replace(/0+$/u,'');const exponent=BigInt(match[4]??'0')-BigInt(fraction.length)+BigInt(digits.length-significant.length);return match[1]+significant+'e'+exponent;}
/** Parse only explicit decimal editing that round-trips without rounding or underflow. */
export function parseFilterNumber(raw:string):number|undefined{if(!decimalPattern.test(raw))return;const value=Number(raw);if(!Number.isFinite(value)||decimalIdentity(raw)!==decimalIdentity(String(value)))return;return value;}

/** Explicit typed key-array literals; JSON numbers must also round-trip without loss. */
export function parseFilterKeys(raw:string):readonly (string|number)[]|undefined{
 const numberTokens=raw.replace(/"(?:[^"\\]|\\.)*"/gu,'""').matchAll(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/gu);
 for(const token of numberTokens)if(parseFilterNumber(token[0])===undefined)return;
 let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return;}
 if(!dense(parsed,key=>typeof key==='string'||typeof key==='number'&&Number.isFinite(key)))return;
 return parsed as readonly (string|number)[];
}
