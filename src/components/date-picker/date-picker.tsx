'use client';
import { createContext, useContext, useCallback, useId, useLayoutEffect, useRef, useState, type Ref } from 'react';
import type { ControlProps, P1InputProps, SurfaceProps, ValueProps, DateRange, ISODate } from '../../types/index.js';
import { en } from '../../i18n/en.js';
import { parseISODate } from '../../lib/civil-date.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { FieldControlError, useFieldControl } from '../field/field.js';
import { Popover } from '../popover/popover.js';
import {CalendarSurface,isSelectableDate} from './calendar-surface.js';
export {isSelectableDate} from './calendar-surface.js';

export type CalendarBase = {referenceDate: ISODate; min?: ISODate; max?: ISODate; isDateDisabled?: (date: ISODate) => boolean; weekStartsOn?: 0|1|2|3|4|5|6; initialMonth?: string};
export type CalendarProps = ValueProps<ISODate|null> & CalendarBase & SurfaceProps & {label: string};
export type DatePickerProps = ValueProps<ISODate|null> & CalendarBase & ControlProps & P1InputProps & SurfaceProps & {ref?: Ref<HTMLInputElement>};
export type DateRangePickerProps = ValueProps<DateRange> & CalendarBase & ControlProps & SurfaceProps & {name?: never; names?: {start: string; end: string}; form?: string; ref?: Ref<HTMLInputElement>};
function formatDate(date: ISODate|null, locale: string) {if(!date||!parseISODate(date))return '';const [year,month,day]=date.split('-');return locale.startsWith('vi')?`${day}/${month}/${year}`:`${month}/${day}/${year}`;}
function parseText(text: string, locale: string): ISODate|null {
  if(parseISODate(text))return text;
  const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(text.trim());if(!match)return null;
  const date=`${match[3]}-${(locale.startsWith('vi')?match[2]:match[1])!.padStart(2,'0')}-${(locale.startsWith('vi')?match[1]:match[2])!.padStart(2,'0')}`;
  return parseISODate(date)?date:null;
}

export function Calendar(props: CalendarProps) {
  const {value,defaultValue,onValueChange,...calendar}=props;
  const report=useDiagnostics('Calendar');
  const [current,setCurrent]=useControllableValue({value,defaultValue,onValueChange,fallback:null,report});
  const selected=current&&parseISODate(current)?current:null;
  return <CalendarSurface {...calendar} selected={selected} isSelected={date=>date===selected} onSelect={setCurrent}/>;
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
