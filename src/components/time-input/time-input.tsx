'use client';
import {useCallback,useContext,useId,useLayoutEffect,useRef,useState,type Ref} from 'react';
import type {ControlProps,P1InputProps,SurfaceProps,ValueProps,LocalTime} from '../../types/index.js';
import {en} from '../../i18n/en.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import {cx} from '../../lib/cx.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import {FieldControlError,useFieldControl} from '../field/field.js';
import {EndpointContext} from '../date-picker/date-picker.js';
type TimeRange={start:LocalTime|null;end:LocalTime|null};
export type TimeInputProps=ValueProps<LocalTime|null>&ControlProps&P1InputProps&SurfaceProps&{ref?:Ref<HTMLInputElement>;precision?:'minute'|'second';min?:LocalTime;max?:LocalTime};
export type TimeRangeInputProps=ValueProps<TimeRange>&ControlProps&SurfaceProps&{name?:never;names?:{start:string;end:string};form?:string;ref?:Ref<HTMLInputElement>;allowOvernight?:boolean};
function parseLocalTime(value:string):number|null {
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(value))return null;
 const [h,m,s=0]=value.split(':').map(Number);return h!*3600+m!*60+s;
}
const TIME_OWNED=['value','defaultValue','onValueChange','precision','min','max','ref','name','className','style','data-testid','label','aria-label','aria-labelledby','nameFromField','description','error','required','aria-describedby','disabled','readOnly','id'] as const;
function inputProps(props: TimeInputProps) {const native={...props} as Record<string,unknown>;for(const key of TIME_OWNED)delete native[key];return native as P1InputProps;}
export function TimeInput(props: TimeInputProps) {
  const {value,defaultValue,onValueChange,precision='minute',min,max,disabled,readOnly,ref,name,className,style,'data-testid':testId}=props;
  const scope=useNovaScope(),report=useDiagnostics('TimeInput');
  const valid=(text:string)=>{const seconds=parseLocalTime(text);return seconds!==null&&(precision==='second'?text.length===8:text.length===5)&&(min===undefined||(parseLocalTime(min)!==null&&seconds>=parseLocalTime(min)!))&&(max===undefined||(parseLocalTime(max)!==null&&seconds<=parseLocalTime(max)!));};
  const control=useFieldControl(props,{component:'TimeInput'}),endpoint=useContext(EndpointContext);
  const [current,setCurrent,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
  const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined);
  const [draft,setDraft]=useState({model:current,locale:scope.locale,text:current??'',blurred:false});
  if(draft.model!==current||draft.locale!==scope.locale)setDraft({model:current,locale:scope.locale,text:current??'',blurred:false});
  const parsed=valid(draft.text)?draft.text:null,invalid=draft.text.trim()!==''&&(!parsed||!valid(parsed));
  const currentInvalid=current!==null&&!valid(current);
  const showError=(invalid&&draft.blurred)||currentInvalid;
  const [input,setInput]=useState<HTMLInputElement|null>(null),inputRef=useRef<HTMLInputElement|null>(null),composing=useRef(false),blocked=useRef(false),compositionCommit=useRef<string|null>(null);
  const errorId=useId();
  const message=scope.strings.forms.invalidTime??en.forms.invalidTime;
  const connect=useCallback((node: HTMLInputElement|null)=>{
    inputRef.current=node;setInput(node);if(!node)return;
    let detach:(()=>void)|undefined;
    if(typeof ref==='function'){const cleanup=ref(node);detach=typeof cleanup==='function'?cleanup:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}
    return ()=>{inputRef.current=null;setInput(null);detach?.();};
  },[ref]);
  useLayoutEffect(()=>{input?.setCustomValidity(invalid||currentInvalid?message:endpoint?.validationMessage??'');},[input,invalid,currentInvalid,message,endpoint?.validationMessage]);
  useNativeFormReset(input,props.form,()=>{if(!controlled){resetValue(initial);if(current!==initial)onValueChange?.(initial);}setDraft({model:controlled?current:initial,locale:scope.locale,text:(controlled?current:initial)??'',blurred:false});});
  const native=inputProps(props);
  function edit(text: string) {
    if(disabled||readOnly||blocked.current)return;
    setDraft(previous=>({...previous,text,blurred:false}));if(composing.current)return;
    const next=text.trim()===''?null:valid(text)?text:null;
    if(text.trim()===''||(next&&valid(next))){
      setCurrent(next);if(controlled||next===null)setDraft(previous=>({...previous,text:(controlled?current:next)??''}));
    }
  }
  if(!control.ok)return <FieldControlError code={control.code} component="TimeInput"/>;
  return control.wrap(<div className={cx('nova-time-input',className)} style={style} data-testid={testId}>
    <input {...native} ref={connect} id={control.id} type="text" className="nova-input" value={draft.text} disabled={disabled} readOnly={readOnly} required={control.required} inputMode={native.inputMode??'numeric'} placeholder={native.placeholder??(precision==='second'?'HH:mm:ss':'HH:mm')}
      aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-invalid={control.invalid||showError||endpoint?.invalid||undefined}
      aria-describedby={[control.ariaDescribedby,endpoint?.describedBy,showError?errorId:undefined].filter(Boolean).join(' ')||undefined}
      onInput={event=>{native.onInput?.(event);blocked.current=event.defaultPrevented;const duplicate=compositionCommit.current===event.currentTarget.value;compositionCommit.current=null;if(!event.defaultPrevented&&!duplicate)edit(event.currentTarget.value);}}
      onChange={event=>{if(event.nativeEvent.type!=='input')edit(event.currentTarget.value);}}
      onBlur={event=>{native.onBlur?.(event);setDraft(previous=>({...previous,blurred:true}));}}
      onCompositionStart={event=>{compositionCommit.current=null;composing.current=true;native.onCompositionStart?.(event);}}
      onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);if(!event.defaultPrevented){edit(event.currentTarget.value);compositionCommit.current=event.currentTarget.value;}}}
/>
    {name!==undefined&&current!==null&&parseLocalTime(current)!==null&&<input type="hidden" name={name} value={current} form={props.form} disabled={disabled}/>}
    {showError&&<p id={errorId} role="alert" className="nova-field__error">{message}</p>}
  </div>);
}

export function TimeRangeInput(props: TimeRangeInputProps) {
  const {value,defaultValue,onValueChange,allowOvernight=false,names,form,ref,disabled,readOnly,className,style,'data-testid':testId}=props;
  const scope=useNovaScope(),report=useDiagnostics('TimeRangeInput'),control=useFieldControl(props,{component:'TimeRangeInput',labelAs:'span'});
  const [current,setCurrent,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:{start:null,end:null} as TimeRange,disabled,readOnly,report});
  const [initial]=useState(defaultValue??{start:null,end:null}),[controlled]=useState(value!==undefined),[rejected,setRejected]=useState<{start:LocalTime|null;end:LocalTime|null;overnight:boolean}|null>(null);
  if(rejected&&(rejected.start!==current.start||rejected.end!==current.end||rejected.overnight!==allowOvernight))setRejected(null);
  const [first,setFirst]=useState<HTMLInputElement|null>(null),errorId=useId();
  const connect=useCallback((node:HTMLInputElement|null)=>{setFirst(node);if(!node)return;let detach:(()=>void)|undefined;if(typeof ref==='function'){const clean=ref(node);detach=typeof clean==='function'?clean:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}return()=>{setFirst(null);detach?.();};},[ref]);
  const message=scope.strings.forms.invalidTimeRange??en.forms.invalidTimeRange;
  const invalid=!!rejected||!!(current.start&&current.end&&!allowOvernight&&current.end<current.start);
  useNativeFormReset(first,form,()=>{setRejected(null);if(!controlled){resetValue(initial);if(current.start!==initial.start||current.end!==initial.end)onValueChange?.(initial);}});
  function change(endpoint:'start'|'end',next:LocalTime|null){const range={...current,[endpoint]:next};if(range.start&&range.end&&!allowOvernight&&range.end<range.start){setRejected({start:current.start,end:current.end,overnight:allowOvernight});return;}setRejected(null);setCurrent(range);}
  if(!control.ok)return <FieldControlError code={control.code} component="TimeRangeInput"/>;
  return control.wrap(<div id={control.id} role="group" aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={[control.ariaDescribedby,invalid?errorId:undefined].filter(Boolean).join(' ')||undefined}
    data-invalid={invalid||control.invalid||undefined} className={cx('nova-time-range-input',className)} style={style} data-testid={testId}>
    <EndpointContext value={{invalid:control.invalid,describedBy:control.ariaDescribedby}}><TimeInput label={scope.strings.forms.startTime??en.forms.startTime} value={current.start} onValueChange={next=>change('start',next)} ref={connect} name={names?.start} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/></EndpointContext>
    <EndpointContext value={{invalid:control.invalid||invalid,describedBy:[control.ariaDescribedby,invalid?errorId:undefined].filter(Boolean).join(' ')||undefined,validationMessage:invalid?message:undefined}}><TimeInput label={scope.strings.forms.endTime??en.forms.endTime} value={current.end} onValueChange={next=>change('end',next)} name={names?.end} form={form} disabled={disabled} readOnly={readOnly} required={control.required}/></EndpointContext>
    {allowOvernight&&current.start&&current.end&&parseLocalTime(current.start)!==null&&parseLocalTime(current.end)!==null&&current.end<current.start&&<p className="nova-field__description">{scope.strings.forms.nextDay??en.forms.nextDay}</p>}
    {invalid&&<p id={errorId} role="alert" className="nova-field__error">{message}</p>}
  </div>);
}
