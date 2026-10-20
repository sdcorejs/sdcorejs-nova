'use client';
import {useCallback,useId,useState,type Ref} from 'react';
import type {ValueProps,ControlProps,SurfaceProps,DateTimeAdapter,ISOInstant} from '../../types/index.js';
import {parseISOInstant} from '../../lib/civil-date.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import {cx} from '../../lib/cx.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import {en} from '../../i18n/en.js';
import {FieldControlError,useFieldControl} from '../field/field.js';
import {DatePicker,EndpointContext,type CalendarBase} from '../date-picker/date-picker.js';
import {TimeInput} from '../time-input/time-input.js';
export type DateTimePickerProps=ValueProps<ISOInstant|null>&ControlProps&CalendarBase&SurfaceProps&{form?:string;ref?:Ref<HTMLInputElement>;timeZone:string;adapter:DateTimeAdapter;disambiguation?:'reject'|'earlier'|'later';
 /** Time field precision. 'minute' (default) edits HH:mm and resolves whole minutes; 'second' edits HH:mm:ss. */
 precision?:'minute'|'second'};
type Precision=NonNullable<DateTimePickerProps['precision']>;
function wallTime(instant:ISOInstant|null,zone:string,precision:Precision):{date:string|null;time:string|null;invalid:boolean} {
 try {
  const format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  if(instant===null)return {date:null,time:null,invalid:false};const parsed=parseISOInstant(instant);if(!parsed)return {date:null,time:null,invalid:true};
  const parts=format.formatToParts(parsed),part=(name:string)=>parts.find(p=>p.type===name)!.value;
  return {date:`${part('year')}-${part('month')}-${part('day')}`,time:precision==='second'?`${part('hour')}:${part('minute')}:${part('second')}`:`${part('hour')}:${part('minute')}`,invalid:false};
 }catch{return {date:null,time:null,invalid:true};}
}
export function DateTimePicker(props:DateTimePickerProps) {
 const {value,defaultValue,onValueChange,ref,name,form,disabled,readOnly,timeZone,adapter,disambiguation='reject',precision='minute',referenceDate,min,max,isDateDisabled,weekStartsOn,initialMonth,className,style,'data-testid':testId}=props;
 const scope=useNovaScope(),report=useDiagnostics('DateTimePicker'),control=useFieldControl(props,{component:'DateTimePicker',labelAs:'span'});
 const [current,setCurrent,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
 const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined);
 // Wall fields are a projection of the instant for one zone and precision; a minute projection drops the seconds.
 const project=(model:ISOInstant|null)=>({model,zone:timeZone,precision,...wallTime(model,timeZone,precision)});
 const [wall,setWall]=useState(()=>project(current));
 if(wall.model!==current||wall.zone!==timeZone||wall.precision!==precision)setWall(project(current));
 const [first,setFirst]=useState<HTMLInputElement|null>(null),errorId=useId(),message=scope.strings.forms.invalidDateTime??en.forms.invalidDateTime;
 const connect=useCallback((node:HTMLInputElement|null)=>{setFirst(node);if(!node)return;let detach:(()=>void)|undefined;if(typeof ref==='function'){const clean=ref(node);detach=typeof clean==='function'?clean:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}return()=>{setFirst(null);detach?.();};},[ref]);
 useNativeFormReset(first,form,()=>{if(!controlled){resetValue(initial);if(current!==initial)onValueChange?.(initial);}setWall(project(controlled?current:initial));});
 function change(endpoint:'date'|'time',next:string|null) {
  if(disabled||readOnly)return;const proposal={...wall,[endpoint]:next,invalid:false};
  if(!proposal.date||!proposal.time){setWall(controlled&&current!==null?project(current):{...proposal,model:controlled?current:null});setCurrent(null);return;}
  try {
   // Adapters always receive HH:mm:ss; minute precision resolves the start of the minute.
   const result=adapter.resolve({date:proposal.date,time:precision==='minute'?`${proposal.time}:00`:proposal.time,timeZone,disambiguation});
   const parsed=result.status==='resolved'?parseISOInstant(result.instant):null;
   if(!parsed){setWall({...proposal,invalid:true});return;}
   setCurrent(parsed.toISOString());setWall(controlled?project(current):proposal);
  }catch{setWall({...proposal,invalid:true});}
 }
 if(!control.ok)return <FieldControlError component="DateTimePicker" code={control.code}/>;
 const parsed=current!==null?parseISOInstant(current):null;
 const meta={invalid:control.invalid||wall.invalid,describedBy:[control.ariaDescribedby,wall.invalid?errorId:undefined].filter(Boolean).join(' ')||undefined,validationMessage:wall.invalid?message:undefined};
 return control.wrap(<div id={control.id} role="group" aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} className={cx('nova-date-time-picker',className)} style={style} data-testid={testId}>
  <EndpointContext value={meta}><DatePicker label={scope.strings.forms.date??en.forms.date} referenceDate={referenceDate} min={min} max={max} isDateDisabled={isDateDisabled} weekStartsOn={weekStartsOn} initialMonth={initialMonth} value={wall.date} onValueChange={next=>change('date',next)} ref={connect} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/>
  <TimeInput label={scope.strings.forms.time??en.forms.time} precision={precision} value={wall.time} onValueChange={next=>change('time',next)} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/></EndpointContext>
  {name!==undefined&&parsed&&<input type="hidden" name={name} value={parsed.toISOString()} form={form} disabled={disabled}/>}
  {wall.invalid&&<p id={errorId} role="alert" className="nova-field__error">{message}</p>}
 </div>);
}
