'use client';
import {useEffect,useLayoutEffect,useRef,useState,type Ref} from 'react';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {useNovaScope} from '../../providers/nova/context.js';
import {validFilterFields,validateFilterRules,validFilterValue} from '../../query/filter-contract.js';
import {QueryFieldEditor,queryMessage,queryStrings} from '../../query/query-field-editor.js';
import type {FilterField,FilterRule} from '../../query/filter-types.js';
import type {SurfaceProps} from '../../types/index.js';
import {Button,IconButton} from '../button/button.js';
import {FilterPanel} from './filter-panel.js';
export type QueryBarProps=SurfaceProps&{fields:readonly FilterField[];value:readonly FilterRule[];onValueChange:(rules:readonly FilterRule[])=>void;onApply?:(rules:readonly FilterRule[])=>void|Promise<void>;disabled?:boolean;ref?:Ref<HTMLDivElement>};
declare const process:{env:{NODE_ENV?:string}};
function production():boolean{try{return process.env.NODE_ENV==='production';}catch{return false;}}
type RemovalFocusIntent={origin:HTMLElement;activeAtRequest:Element|null;next:string|null;previous:string|null;before:readonly FilterRule[];expected:readonly FilterRule[];release:()=>void};
type Draft={key:number;rule:FilterRule;valueText?:string};
function shapedRules(value:unknown):value is readonly FilterRule[]{if(!Array.isArray(value))return false;for(let i=0;i<value.length;i++){const rule:unknown=value[i];if(!Object.hasOwn(value,i)||!rule||typeof rule!=='object'||!('fieldId'in rule)||typeof rule.fieldId!=='string'||!('operator'in rule)||typeof rule.operator!=='string'||!('value'in rule))return false;}return true;}
function sameRules(actual:unknown,expected:readonly FilterRule[]):boolean{if(!shapedRules(actual)||actual.length!==expected.length)return false;return actual.every((rule,index)=>{const other=expected[index]!;if(rule.fieldId!==other.fieldId||rule.operator!==other.operator)return false;if(!Array.isArray(rule.value)||!Array.isArray(other.value))return Object.is(rule.value,other.value);if(rule.value.length!==other.value.length)return false;for(let i=0;i<rule.value.length;i++)if(Object.hasOwn(rule.value,i)!==Object.hasOwn(other.value,i)||!Object.is(rule.value[i],other.value[i]))return false;return true;});}
/** Applied rules always come from the consumer; all editor changes remain local until Apply. */
export function QueryBar({fields,value,onValueChange,onApply,disabled=false,className,style,'data-testid':testId,ref}:QueryBarProps){
 const scope=useNovaScope(),strings=queryStrings(scope),root=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null),validationFocus=useRef(false),trigger=useRef<HTMLButtonElement>(null);
 const shape=shapedRules(value),metadata=validFilterFields(fields),configuration=shape&&metadata;
 const makeDraft=(rules:readonly FilterRule[]):Draft[]=>rules.map((rule,key)=>({key,rule}));
 const [state,setState]=useState(()=>({accepted:value,nextKey:shape?value.length:0,draft:shape?makeDraft(value):[]}));
 if(state.accepted!==value)setState({accepted:value,nextKey:shape?value.length:0,draft:shape?makeDraft(value):[]});
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState<'validation'|'apply'|null>(null),[removal,setRemoval]=useState<{expected:readonly FilterRule[];message:string;serial:number}|null>(null);
 const lock=useRef(false),mounted=useRef(false),focusAfterRemove=useRef<RemovalFocusIntent|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;focusAfterRemove.current?.release();focusAfterRemove.current=null;};},[]);
 useEffect(()=>{if(configuration)return;const code='NOVA_QUERY_INVALID_CONFIGURATION';if(production()||scope.diagnostics.seen.has(code))return;scope.diagnostics.seen.add(code);console.warn('[Nova] '+code+': QueryBar requires valid supplied fields and rules.');},[configuration,scope.diagnostics]);
 // A controlled consumer may accept in a later task. Only acceptance, a
 // different accepted value, or subsequent user navigation ends this intent.
 useLayoutEffect(()=>{
  const intent=focusAfterRemove.current;if(!intent)return;
  if(!sameRules(value,intent.expected)){if(!sameRules(value,intent.before)){intent.release();focusAfterRemove.current=null;}return;}
  intent.release();focusAfterRemove.current=null;
  const owner=intent.origin.ownerDocument,active=owner.activeElement;
  if(active!==owner.body&&active!==intent.origin&&active!==root.current&&active!==intent.activeAtRequest)return;
  const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-query-chip]')??[]);
  const target=buttons.find(button=>button.dataset.queryChip===intent.next)??buttons.find(button=>button.dataset.queryChip===intent.previous)??trigger.current;
  target?.focus();
 },[value]);
 useEffect(()=>{if(disabled||!configuration){focusAfterRemove.current?.release();focusAfterRemove.current=null;}},[disabled,configuration]);
 useLayoutEffect(()=>{if(!validationFocus.current)return;validationFocus.current=false;(open?panel.current:root.current)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();});
 const announcement=removal&&sameRules(value,removal.expected)?removal.message:'';
 const rules=state.draft.map(item=>item.rule),validation=validateFilterRules(fields,rules);
 const update=(key:number,rule:FilterRule,valueText?:string)=>{if(disabled||lock.current)return;setState(current=>({...current,draft:current.draft.map(item=>item.key===key?{...item,rule,valueText}:item)}));setError(null);};
 const commit=(next:readonly FilterRule[])=>{
  if(disabled||lock.current||!configuration)return;
  if(!validateFilterRules(fields,next).ok){validationFocus.current=true;setError('validation');return;}
  lock.current=true;setPending(true);setError(null);
  const finish=(failed:boolean)=>{lock.current=false;if(!mounted.current)return;setPending(false);if(failed)setError('apply');};
  try{onValueChange(next);const result=onApply?.(next);if(result&&typeof result.then==='function')void Promise.resolve(result).then(()=>finish(false),()=>finish(true));else finish(false);}catch{finish(true);}
 };
 const display=(rule:FilterRule)=>{const field=fields.find(item=>item.id===rule.fieldId);if(!field||!validFilterValue(field,rule.value))return strings.check;return rule.value===null?strings.nullValue:Array.isArray(rule.value)?rule.value.map(key=>(typeof key==='number'?strings.numberKeyType:strings.stringKeyType)+': '+key).join(', '):String(rule.value);};
 const chipKey=(rule:FilterRule,index:number)=>JSON.stringify([rule.fieldId,rule.operator,index]);
 const remove=(rule:FilterRule,index:number,origin:HTMLButtonElement)=>{
  if(disabled||lock.current||!shape)return;
  focusAfterRemove.current?.release();
  const owner=origin.ownerDocument,expected=value.filter((_rule,i)=>i!==index);
  const label=fields.find(field=>field.id===rule.fieldId)?.label??rule.fieldId;
  const revoke=()=>{if(focusAfterRemove.current===intent)focusAfterRemove.current=null;intent.release();};
  const focus=(event:FocusEvent)=>{if(event.target!==origin)revoke();};
  const release=()=>{owner.removeEventListener('focusin',focus,true);owner.removeEventListener('pointerdown',revoke,true);owner.removeEventListener('keydown',revoke,true);owner.defaultView?.removeEventListener('blur',revoke);};
  const intent:RemovalFocusIntent={origin,activeAtRequest:owner.activeElement,next:value[index+1]?chipKey(value[index+1]!,index):null,previous:value[index-1]?chipKey(value[index-1]!,index-1):null,before:value,expected,release};
  focusAfterRemove.current=intent;
  owner.addEventListener('focusin',focus,true);owner.addEventListener('pointerdown',revoke,true);owner.addEventListener('keydown',revoke,true);owner.defaultView?.addEventListener('blur',revoke);
  setRemoval(current=>({expected,message:queryMessage(strings.removed,{label}),serial:(current?.serial??0)+1}));
  onValueChange(expected);
 };
 const editors=<><div className="nova-query-bar__draft">{state.draft.map(item=>{const field=fields.find(candidate=>candidate.id===item.rule.fieldId),bad=error==='validation'&&validation.invalidIndexes.includes(state.draft.indexOf(item));return <div key={item.key} className="nova-query-bar__rule"><QueryFieldEditor fields={fields} rule={item.rule} valueText={item.valueText} onChange={(rule,text)=>update(item.key,rule,text)} disabled={disabled||pending} error={bad?strings.check:undefined}/><IconButton variant="ghost" className="nova-query-bar__remove-draft" disabled={disabled||pending} label={queryMessage(strings.removeDraft,{label:field?.label??item.rule.fieldId})} icon={<Icon name="close"/>} onClick={()=>{setState(current=>({...current,draft:current.draft.filter(row=>row.key!==item.key)}));setError(null);}}/></div>;})}</div><div className="nova-query-bar__actions"><Button variant="secondary" className="nova-query-bar__add" disabled={disabled||pending||fields.length===0} onClick={()=>{const field=fields[0];if(field)setState(current=>({...current,nextKey:current.nextKey+1,draft:[...current.draft,{key:current.nextKey,rule:{fieldId:field.id,operator:field.operators[0]!,value:null}}]}));}}><Icon name="plus"/>{strings.add}</Button><Button disabled={disabled||pending} onClick={()=>commit(rules)}>{strings.apply}</Button><Button variant="secondary" disabled={disabled||pending} onClick={()=>{setState(current=>({...current,draft:[]}));commit([]);}}>{strings.clear}</Button></div></>;
 return <div ref={node=>{root.current=node;if(typeof ref==='function')return ref(node);if(ref)ref.current=node;}} className={cx('nova-query-bar',className)} style={style} data-testid={testId} aria-busy={pending||undefined}>
 {!configuration?<p role="alert">{scope.strings.forms.configurationError}</p>:<><div className="nova-query-bar__chips">{value.map((rule,index)=>{const field=fields.find(item=>item.id===rule.fieldId);const label=field?.label??rule.fieldId;return <Button key={chipKey(rule,index)} data-query-chip={chipKey(rule,index)} variant="secondary" className="nova-query-bar__chip" disabled={disabled||pending} aria-label={queryMessage(strings.remove,{label,value:display(rule)})} onClick={event=>remove(rule,index,event.currentTarget)}><span className="nova-query-bar__chip-text"><span className="nova-query-bar__chip-field">{label}:</span> {display(rule)}</span><span className="nova-query-bar__chip-remove"><Icon name="close"/></span></Button>;})}</div><Button ref={trigger} className="nova-query-bar__trigger" variant="secondary" disabled={disabled} aria-expanded={open} onClick={()=>setOpen(true)}>{strings.filters}</Button>{!open&&<div className="nova-query-bar__desktop">{editors}</div>}<FilterPanel open={open} onOpenChange={setOpen} returnFocusRef={trigger}><div ref={panel} className="nova-query-bar__panel" aria-busy={pending||undefined}>{editors}{error&&<p role="alert">{error==='apply'?strings.failure:strings.check}</p>}</div></FilterPanel>{!open&&error&&<p role="alert">{error==='apply'?strings.failure:strings.check}</p>}</>}
 <p role="status" aria-live="polite" aria-atomic="true" className="nova-query-bar__announcement">{announcement&&<span key={removal?.serial}>{announcement}</span>}</p></div>;
}
