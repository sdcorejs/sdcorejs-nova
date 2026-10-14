'use client';
import { createContext, useContext, useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import type { ControlProps, P1InputProps, SurfaceProps, ValueProps, DateRange, ISODate } from '../../types/index.js';
import { en } from '../../i18n/en.js';
import { parseISODate } from '../../lib/civil-date.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { FieldControlError, useFieldControl } from '../field/field.js';
import { Popover } from '../popover/popover.js';

export type CalendarBase = {referenceDate: ISODate; min?: ISODate; max?: ISODate; isDateDisabled?: (date: ISODate) => boolean; weekStartsOn?: 0|1|2|3|4|5|6; initialMonth?: string};
export type CalendarProps = ValueProps<ISODate|null> & CalendarBase & SurfaceProps & {label: string};
export type DatePickerProps = ValueProps<ISODate|null> & CalendarBase & ControlProps & P1InputProps & SurfaceProps & {ref?: Ref<HTMLInputElement>};
export type DateRangePickerProps = ValueProps<DateRange> & CalendarBase & ControlProps & SurfaceProps & {name?: never; names?: {start: string; end: string}; form?: string; ref?: Ref<HTMLInputElement>};
function iso(date: Date): ISODate {return date.toISOString().slice(0,10);}
function monthOf(date: ISODate) {return date.slice(0,7);}
function monthLength(year: number, month: number) {return [31,(year%4===0 && (year%100!==0 || year%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][month-1]!;}
function shiftMonth(date: ISODate, delta: number): ISODate {
  const [y,m,d]=date.split('-').map(Number) as [number,number,number];
  const count=Math.max(12,Math.min(9999*12+11,y*12+m-1+delta)),year=Math.floor(count/12),month=count%12+1;
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(Math.min(d,monthLength(year,month))).padStart(2,'0')}`;
}
function shiftDay(date: ISODate, delta: number): ISODate {
  const next=new Date(parseISODate(date)!.getTime()+delta*86400000);
  if(next.getUTCFullYear()<1)return '0001-01-01';if(next.getUTCFullYear()>9999)return '9999-12-31';return iso(next);
}
function validMonth(month: string|undefined) {return !!month && /^\d{4}-\d{2}$/u.test(month) && !!parseISODate(`${month}-01`);}
export function isSelectableDate(date: ISODate, options: Pick<CalendarBase,'min'|'max'|'isDateDisabled'>): boolean {
  return !!parseISODate(date) && (!options.min || (!!parseISODate(options.min) && date>=options.min))
    && (!options.max || (!!parseISODate(options.max) && date<=options.max)) && !options.isDateDisabled?.(date);
}
function formatDate(date: ISODate|null, locale: string) {if(!date||!parseISODate(date))return '';const [year,month,day]=date.split('-');return locale.startsWith('vi')?`${day}/${month}/${year}`:`${month}/${day}/${year}`;}
function parseText(text: string, locale: string): ISODate|null {
  if(parseISODate(text))return text;
  const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(text.trim());if(!match)return null;
  const date=`${match[3]}-${(locale.startsWith('vi')?match[2]:match[1])!.padStart(2,'0')}-${(locale.startsWith('vi')?match[1]:match[2])!.padStart(2,'0')}`;
  return parseISODate(date)?date:null;
}

export function Calendar(props: CalendarProps) {
  const {value,defaultValue,onValueChange,referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth,label,className,style,'data-testid':testId}=props;
  if(!parseISODate(referenceDate))throw new TypeError('Calendar referenceDate must be a valid ISODate');
  const scope=useNovaScope(),report=useDiagnostics('Calendar');
  const [current,setCurrent]=useControllableValue({value,defaultValue,onValueChange,fallback:null,report});
  const selected=current&&parseISODate(current)?current:null;
  const initial=validMonth(initialMonth)?initialMonth!:monthOf(selected??referenceDate);
  const [month,setMonth]=useState(initial),[focused,setFocused]=useState(selected&&monthOf(selected)===initial?selected:`${initial}-${referenceDate.slice(8)}`);
  const grid=useRef<HTMLTableElement>(null),moveFocus=useRef(false),id=useId();
  const first=`${month}-01`,parsedFirst=parseISODate(first)!;
  const start=weekStartsOn??(scope.locale.startsWith('vi')?1:0);
  const offset=(parsedFirst.getUTCDay()-start+7)%7;
  const [year,numberMonth]=month.split('-').map(Number) as [number,number];
  const count=monthLength(year,numberMonth),cells=Math.ceil((offset+count)/7)*7;
  const fallback=`${month}-${String(Math.min(Number(referenceDate.slice(8)),count)).padStart(2,'0')}`;
  const active=parseISODate(focused)&&monthOf(focused)===month?focused:fallback;
  const full=new Intl.DateTimeFormat(scope.locale,{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
  const title=new Intl.DateTimeFormat(scope.locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(parsedFirst);
  useLayoutEffect(()=>{if(moveFocus.current){grid.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus();moveFocus.current=false;}},[month,active]);
  function move(next: ISODate) {moveFocus.current=true;setFocused(next);setMonth(monthOf(next));}
  function key(event: KeyboardEvent<HTMLButtonElement>,date: ISODate) {
    if(event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey)return;
    const weekday=(parseISODate(date)!.getUTCDay()-start+7)%7;
    const delta=event.key==='ArrowLeft'?(scope.dir==='rtl'?1:-1):event.key==='ArrowRight'?(scope.dir==='rtl'?-1:1):event.key==='ArrowUp'?-7:event.key==='ArrowDown'?7:event.key==='Home'?-weekday:event.key==='End'?6-weekday:null;
    if(delta!==null){event.preventDefault();move(shiftDay(date,delta));}
    else if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();move(shiftMonth(date,event.key==='PageUp'?-1:1));}
  }
  return <div className={cx('nova-calendar',className)} style={style} data-testid={testId}>
    <div className="nova-calendar__header"><button type="button" aria-label={scope.strings.forms.previousMonth??en.forms.previousMonth} disabled={month==='0001-01'} onClick={()=>move(shiftMonth(active,-1))}>‹</button>
      <span id={id} role="status" aria-live="polite">{title}</span>
      <button type="button" aria-label={scope.strings.forms.nextMonth??en.forms.nextMonth} disabled={month==='9999-12'} onClick={()=>move(shiftMonth(active,1))}>›</button></div>
    <table ref={grid} role="grid" aria-label={label} aria-describedby={id}><thead><tr>{Array.from({length:7},(_,index)=><th key={index} scope="col">{new Intl.DateTimeFormat(scope.locale,{weekday:'short',timeZone:'UTC'}).format(parseISODate(shiftDay('2024-01-07',(start+index)%7))!)}</th>)}</tr></thead>
      <tbody>{Array.from({length:cells/7},(_,row)=><tr key={row}>{Array.from({length:7},(_,col)=>{
        const day=row*7+col-offset+1;if(day<1||day>count)return <td key={col}/>;
        const date=`${month}-${String(day).padStart(2,'0')}`,disabled=!isSelectableDate(date,{min,max,isDateDisabled});
        return <td key={col} aria-selected={date===selected}><button type="button" data-date={date} tabIndex={date===active?0:-1} aria-label={full.format(parseISODate(date)!)} aria-current={date===referenceDate?'date':undefined} aria-disabled={disabled||undefined}
          onFocus={()=>setFocused(date)} onKeyDown={event=>key(event,date)} onClick={()=>{if(!disabled)setCurrent(date);}}>{day}</button></td>;
      })}</tr>)}</tbody></table>
  </div>;
}

export const EndpointContext=createContext<{invalid:boolean;describedBy?:string;validationMessage?:string}|null>(null);
const DATE_OWNED=['value','defaultValue','onValueChange','referenceDate','min','max','isDateDisabled','weekStartsOn','initialMonth','ref','name','className','style','data-testid','label','aria-label','aria-labelledby','nameFromField','description','error','required','aria-describedby','disabled','readOnly','id'] as const;
function inputProps(props: DatePickerProps) {const native={...props} as Record<string,unknown>;for(const key of DATE_OWNED)delete native[key];return native as P1InputProps;}
export function DatePicker(props: DatePickerProps) {
  const {value,defaultValue,onValueChange,referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth,disabled,readOnly,ref,name,className,style,'data-testid':testId}=props;
  const scope=useNovaScope(),report=useDiagnostics('DatePicker');
  const control=useFieldControl(props,{component:'DatePicker'}),endpoint=useContext(EndpointContext);
  const [current,setCurrent,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
  const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined);
  const [draft,setDraft]=useState({model:current,locale:scope.locale,text:formatDate(current,scope.locale),blurred:false});
  if(draft.model!==current||draft.locale!==scope.locale)setDraft({model:current,locale:scope.locale,text:formatDate(current,scope.locale),blurred:false});
  const parsed=parseText(draft.text,scope.locale),invalid=draft.text.trim()!==''&&(!parsed||!isSelectableDate(parsed,{min,max,isDateDisabled}));
  const currentInvalid=current!==null&&!isSelectableDate(current,{min,max,isDateDisabled});
  const showError=(invalid&&draft.blurred)||currentInvalid;
  const [input,setInput]=useState<HTMLInputElement|null>(null),inputRef=useRef<HTMLInputElement|null>(null),composing=useRef(false),blocked=useRef(false),compositionCommit=useRef<string|null>(null);
  const [open,setOpen]=useState(false),errorId=useId();
  const message=scope.strings.forms.invalidDate??en.forms.invalidDate;
  const connect=useCallback((node: HTMLInputElement|null)=>{
    inputRef.current=node;setInput(node);if(!node)return;
    let detach:(()=>void)|undefined;
    if(typeof ref==='function'){const cleanup=ref(node);detach=typeof cleanup==='function'?cleanup:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}
    return ()=>{inputRef.current=null;setInput(null);detach?.();};
  },[ref]);
  useLayoutEffect(()=>{input?.setCustomValidity(invalid||currentInvalid?message:endpoint?.validationMessage??'');},[input,invalid,currentInvalid,message,endpoint?.validationMessage]);
  useNativeFormReset(input,props.form,()=>{if(!controlled){resetValue(initial);if(current!==initial)onValueChange?.(initial);}setDraft({model:controlled?current:initial,locale:scope.locale,text:formatDate(controlled?current:initial,scope.locale),blurred:false});setOpen(false);});
  const native=inputProps(props);
  function edit(text: string) {
    if(disabled||readOnly||blocked.current)return;
    setDraft(previous=>({...previous,text,blurred:false}));if(composing.current)return;
    const next=text.trim()===''?null:parseText(text,scope.locale);
    if(text.trim()===''||(next&&isSelectableDate(next,{min,max,isDateDisabled}))){
      setCurrent(next);if(controlled||next===null)setDraft(previous=>({...previous,text:formatDate(controlled?current:next,scope.locale)}));
    }
  }
  if(!control.ok)return <FieldControlError code={control.code} component="DatePicker"/>;
  return control.wrap(<div className={cx('nova-date-picker',className)} style={style} data-testid={testId}>
    <input {...native} ref={connect} id={control.id} type="text" className="nova-input" value={draft.text} disabled={disabled} readOnly={readOnly} required={control.required} inputMode={native.inputMode??'numeric'}
      aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-invalid={control.invalid||showError||endpoint?.invalid||undefined}
      aria-describedby={[control.ariaDescribedby,endpoint?.describedBy,showError?errorId:undefined].filter(Boolean).join(' ')||undefined}
      onInput={event=>{native.onInput?.(event);blocked.current=event.defaultPrevented;const duplicate=compositionCommit.current===event.currentTarget.value;compositionCommit.current=null;if(!event.defaultPrevented&&!duplicate)edit(event.currentTarget.value);}}
      onChange={event=>{if(event.nativeEvent.type!=='input')edit(event.currentTarget.value);}}
      onBlur={event=>{native.onBlur?.(event);setDraft(previous=>({...previous,blurred:true}));}}
      onCompositionStart={event=>{compositionCommit.current=null;composing.current=true;native.onCompositionStart?.(event);}}
      onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);if(!event.defaultPrevented){edit(event.currentTarget.value);compositionCommit.current=event.currentTarget.value;}}}
      onKeyDown={event=>{native.onKeyDown?.(event);if(!event.defaultPrevented&&event.key==='Escape'&&!event.nativeEvent.isComposing){setOpen(false);inputRef.current?.focus();}}}/>
    {name!==undefined&&current!==null&&parseISODate(current)&&<input type="hidden" name={name} value={current} form={props.form} disabled={disabled}/>}
    <Popover value={open&&!disabled&&!readOnly} onValueChange={setOpen} label={scope.strings.forms.calendar??en.forms.calendar} returnFocusRef={inputRef} disabled={disabled||readOnly}
      className="nova-date-picker__popup" trigger={<button type="button" aria-label={scope.strings.forms.openCalendar??en.forms.openCalendar}>▦</button>}>
      <Calendar label={scope.strings.forms.calendar??en.forms.calendar} value={current} onValueChange={next=>{setCurrent(next);setDraft({model:controlled?current:next,locale:scope.locale,text:formatDate(controlled?current:next,scope.locale),blurred:false});setOpen(false);inputRef.current?.focus();}} referenceDate={referenceDate} min={min} max={max} isDateDisabled={isDateDisabled} weekStartsOn={weekStartsOn} initialMonth={initialMonth}/>
      <button type="button" className="nova-date-picker__close" onClick={()=>{setOpen(false);inputRef.current?.focus();}}>{scope.strings.common.close}</button>
    </Popover>
    {showError&&<p id={errorId} role="alert" className="nova-field__error">{message}</p>}
  </div>);
}

export function DateRangePicker(props: DateRangePickerProps) {
  const {value,defaultValue,onValueChange,referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth,names,form,ref,disabled,readOnly,className,style,'data-testid':testId}=props;
  const scope=useNovaScope(),report=useDiagnostics('DateRangePicker'),control=useFieldControl(props,{component:'DateRangePicker',labelAs:'span'});
  const [current,setCurrent,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:{start:null,end:null} as DateRange,disabled,readOnly,report});
  const [initial]=useState(defaultValue??{start:null,end:null}),[controlled]=useState(value!==undefined),[rejected,setRejected]=useState<{start:ISODate|null;end:ISODate|null}|null>(null);
  if(rejected&&(rejected.start!==current.start||rejected.end!==current.end))setRejected(null);
  const [first,setFirst]=useState<HTMLInputElement|null>(null),errorId=useId();
  const connect=useCallback((node:HTMLInputElement|null)=>{setFirst(node);if(!node)return;let detach:(()=>void)|undefined;if(typeof ref==='function'){const clean=ref(node);detach=typeof clean==='function'?clean:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}return()=>{setFirst(null);detach?.();};},[ref]);
  const message=scope.strings.forms.invalidDateRange??en.forms.invalidDateRange;
  const invalid=!!rejected||!!(current.start&&current.end&&current.end<current.start);
  useNativeFormReset(first,form,()=>{setRejected(null);if(!controlled){resetValue(initial);if(current.start!==initial.start||current.end!==initial.end)onValueChange?.(initial);}});
  function change(endpoint:'start'|'end',next:ISODate|null){const range={...current,[endpoint]:next};if(range.start&&range.end&&range.end<range.start){setRejected({start:current.start,end:current.end});return;}setRejected(null);setCurrent(range);}
  if(!control.ok)return <FieldControlError code={control.code} component="DateRangePicker"/>;
  const calendar={referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth};
  return control.wrap(<div id={control.id} role="group" aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={[control.ariaDescribedby,invalid?errorId:undefined].filter(Boolean).join(' ')||undefined}
    data-invalid={invalid||control.invalid||undefined} className={cx('nova-date-range-picker',className)} style={style} data-testid={testId}>
    <EndpointContext value={{invalid:control.invalid,describedBy:control.ariaDescribedby}}><DatePicker {...calendar} label={scope.strings.forms.startDate??en.forms.startDate} value={current.start} onValueChange={next=>change('start',next)} ref={connect} name={names?.start} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/></EndpointContext>
    <EndpointContext value={{invalid:control.invalid||invalid,describedBy:[control.ariaDescribedby,invalid?errorId:undefined].filter(Boolean).join(' ')||undefined,validationMessage:invalid?message:undefined}}><DatePicker {...calendar} label={scope.strings.forms.endDate??en.forms.endDate} value={current.end} onValueChange={next=>change('end',next)} name={names?.end} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/></EndpointContext>
    {invalid&&<p id={errorId} role="alert" className="nova-field__error">{message}</p>}
  </div>);
}
