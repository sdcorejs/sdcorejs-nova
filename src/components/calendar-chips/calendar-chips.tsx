'use client';
import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {Ref} from 'react';
import type {ControlProps,SurfaceProps,ValueProps,ISODate} from '../../types/index.js';
import {en} from '../../i18n/en.js';
import {parseISODate} from '../../lib/civil-date.js';
import {cx} from '../../lib/cx.js';
import {Icon} from '../../lib/icons.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import {FieldControlError,useFieldControl} from '../field/field.js';
import {Popover} from '../popover/popover.js';
import {CalendarSurface} from '../date-picker/calendar-surface.js';
export type CalendarChipsProps=ValueProps<readonly ISODate[]>&ControlProps&SurfaceProps&{referenceDate:ISODate;min?:ISODate;max?:ISODate;maxDates?:number;form?:string;ref?:Ref<HTMLElement>;focusRef?:Ref<HTMLElement>};
// Callback refs own their React 19 cleanup; legacy callbacks receive null on detach.
function attachCalendarChipsRef(ref:Ref<HTMLElement>|undefined,node:HTMLElement):(()=>void)|undefined {
 if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>ref(null);}
 if(ref){ref.current=node;return()=>{ref.current=null;};}
}
const validDate=(date:unknown):date is ISODate=>typeof date==='string'&&!!parseISODate(date);
// Indexed iteration also rejects sparse arrays; sorting never mutates consumer values.
function normalize(value:unknown):ISODate[]|null {if(!Array.isArray(value))return null;const result:ISODate[]=[];for(let index=0;index<value.length;index++){if(!Object.hasOwn(value,index)||!validDate(value[index]))return null;result.push(value[index]);}return [...new Set(result)].sort();}
const same=(left:readonly ISODate[],right:readonly ISODate[])=>left.length===right.length&&left.every((date,index)=>date===right[index]);
export function CalendarChips(props:CalendarChipsProps){
 const {value,defaultValue,onValueChange,referenceDate,min,max,maxDates,disabled,readOnly,name,form,ref,focusRef,className,style,'data-testid':testId}=props;
 const scope=useNovaScope(),report=useDiagnostics('CalendarChips'),control=useFieldControl(props,{component:'CalendarChips'});
 const [current,setCurrent,resetValue]=useControllableValue<readonly ISODate[]>({value,defaultValue,onValueChange,fallback:[],disabled,readOnly,report});
 const [initial]=useState(()=>normalize(defaultValue??[])),[controlled]=useState(value!==undefined);
 const dates=normalize(current),valid=!!dates&&validDate(referenceDate)&&(min===undefined||validDate(min))&&(max===undefined||validDate(max))&&!(min&&max&&min>max)&&(maxDates===undefined||Number.isSafeInteger(maxDates)&&maxDates>=0);
 const [draft,setDraft]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false),[input,setInput]=useState<HTMLInputElement|null>(null),inputRef=useRef<HTMLInputElement|null>(null),buttons=useRef(new Map<ISODate,HTMLButtonElement>()),composing=useRef(false),id=useId();
 // Gating an overlay ends its local open intent; re-enabling requires a new action.
 if(open&&(disabled||readOnly))setOpen(false);
 const connect=useCallback((node:HTMLInputElement|null)=>{inputRef.current=node;setInput(node);return()=>{inputRef.current=null;setInput(null);};},[]);
 const connectRoot=useCallback((node:HTMLDivElement|null)=>{if(node)return attachCalendarChipsRef(ref,node);},[ref]);
 const connectReadonly=useCallback((node:HTMLDivElement|null)=>{if(node)return attachCalendarChipsRef(focusRef,node);},[focusRef]);
 const connectEditable=useCallback((node:HTMLInputElement|null)=>{if(!node)return;const detachInternal=connect(node),detachExternal=attachCalendarChipsRef(focusRef,node);return()=>{detachInternal();detachExternal?.();};},[connect,focusRef]);
 const selected=dates??[],atMax=maxDates!==undefined&&selected.length>=maxDates;
 const vi=scope.locale.toLowerCase().startsWith('vi');
 const messages=scope.strings.forms as typeof scope.strings.forms & Partial<Record<'calendarChipsEmpty'|'calendarChipsMaxDates',string>>;
 const fallback={empty:vi?'Chưa chọn ngày':'No dates selected',limit:vi?'Đã đạt số ngày tối đa. Xóa một ngày để chọn ngày khác.':'Maximum dates reached. Remove a date to select another.'};
 const text={empty:messages.calendarChipsEmpty??fallback.empty,limit:messages.calendarChipsMaxDates??fallback.limit};
 const full=new Intl.DateTimeFormat(scope.locale,{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}),labelOf=(date:ISODate)=>full.format(parseISODate(date)!);
 useEffect(()=>{if(!valid)report('NOVA_DATE_INVALID_CONFIGURATION');},[valid,report]);
 // Composition ends with the editable target lifetime, independently of consumer ref replacement.
 useLayoutEffect(()=>{if(readOnly||!valid||!control.ok)composing.current=false;},[readOnly,valid,control.ok]);
 useLayoutEffect(()=>{input?.setCustomValidity(!disabled&&!readOnly&&(message||control.ok&&control.required&&selected.length===0)?message||scope.strings.forms.required:'');},[input,disabled,readOnly,message,control,selected.length,scope.strings.forms.required]);
 useNativeFormReset(input,form,()=>{if(!controlled&&initial&&dates&&!same(initial,dates)){resetValue(initial);onValueChange?.([...initial]);}setDraft('');setMessage('');setOpen(false);});
 function commit(next:ISODate[]){if(!valid||disabled||readOnly||same(selected,next))return;setCurrent(next);setMessage('');}
 function remove(date:ISODate){commit(selected.filter(item=>item!==date));inputRef.current?.focus();}
 function add(){if(disabled||readOnly)return;const date=draft.trim();if(!validDate(date)||min&&date<min||max&&date>max){setMessage(scope.strings.forms.invalidDate??en.forms.invalidDate);return;}if(selected.includes(date)){setDraft('');setMessage('');return;}if(atMax){setMessage(text.limit);return;}commit([...selected,date].sort());setDraft('');}
 if(!control.ok)return <FieldControlError code={control.code} component="CalendarChips"/>;
 if(!valid)return control.wrap(<span className="nova-config-error" data-nova-config-error="NOVA_DATE_INVALID_CONFIGURATION">{scope.strings.forms.configurationError}</span>);
 const described=[control.ariaDescribedby,message?id+'error':undefined,atMax?id+'limit':undefined].filter(Boolean).join(' ')||undefined;
 const submission=name!==undefined?selected.map(date=><input key={date} type="hidden" name={name} form={form} disabled={disabled} value={date}/>):null;
 if(readOnly)return control.wrap(<div ref={connectRoot} className={cx('nova-calendar-chips',className)} style={style} data-testid={testId}><div ref={connectReadonly} id={control.id} role="textbox" onFocus={props.onFocus} onBlur={props.onBlur} title={props.title} aria-readonly="true" aria-disabled={disabled||undefined} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby??control.labelId} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid||undefined} tabIndex={disabled?-1:0}>{selected.length?selected.map(labelOf).join('; '):text.empty}</div><input type="hidden" ref={connect} form={form}/>{submission}</div>);
 return control.wrap(<div ref={connectRoot} className={cx('nova-calendar-chips',className)} style={style} data-testid={testId} data-disabled={disabled||undefined}>
 <div className="nova-calendar-chips__control">{selected.map(date=>{const label=labelOf(date);return <span key={date} className="nova-calendar-chips__chip"><span>{label}</span>{!disabled&&<button type="button" aria-label={(scope.strings.forms.removeChip??en.forms.removeChip).replace('{label}',label)} ref={node=>{if(node)buttons.current.set(date,node);else buttons.current.delete(date);}} onClick={()=>remove(date)} onKeyDown={event=>{if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();remove(date);}else if(event.key==='Escape'){event.preventDefault();inputRef.current?.focus();}}}><Icon name="close"/></button>}</span>;})}
 <input ref={connectEditable} id={control.id} type="text" className="nova-calendar-chips__input" value={draft} disabled={disabled} form={form} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={described} aria-invalid={control.invalid||!!message||undefined} aria-required={control.required||undefined} onBlur={props.onBlur} onFocus={props.onFocus} title={props.title} onChange={event=>{setDraft(event.target.value);setMessage('');}} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{if(disabled||composing.current||event.nativeEvent.isComposing)return;if(event.key==='Enter'&&draft){event.preventDefault();add();}else if(event.key==='Backspace'&&!draft&&selected.length){event.preventDefault();buttons.current.get(selected[selected.length-1]!)?.focus();}}}/>
 <Popover label={scope.strings.forms.calendar??en.forms.calendar} value={open&&!disabled} onValueChange={setOpen} returnFocusRef={inputRef} disabled={disabled} className="nova-calendar-chips__popup nova-date-picker__popup" trigger={<button type="button" className="nova-calendar-chips__trigger" aria-label={scope.strings.forms.openCalendar??en.forms.openCalendar}><Icon name="calendar"/></button>}>
 <CalendarSurface label={scope.strings.forms.calendar??en.forms.calendar} referenceDate={referenceDate} selected={selected[0]??null} multiple isSelected={date=>selected.includes(date)} isDateDisabled={date=>disabled||!selected.includes(date)&&!!(atMax||min&&date<min||max&&date>max)} disabledDescription={atMax?id+'limit':undefined} onSelect={date=>{if(selected.includes(date))commit(selected.filter(item=>item!==date));else if(!atMax)commit([...selected,date].sort());}}/>
 {atMax&&<p id={id+'limit'} role="status">{text.limit}</p>}<div className="nova-date-picker__footer"><button type="button" className="nova-date-picker__close" onClick={()=>{setOpen(false);inputRef.current?.focus();}}>{scope.strings.common.close}</button></div>
 </Popover></div>{submission}{atMax&&!open&&<p id={id+'limit'} role="status">{text.limit}</p>}{message&&<p id={id+'error'} role="alert" className="nova-field__error">{message}</p>}
 </div>);
}
