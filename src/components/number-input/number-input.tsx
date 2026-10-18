'use client';
import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState,type Ref} from 'react';
import {NumberField as Primitive} from '@base-ui/react/number-field';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import {en} from '../../i18n/en.js';
import {normalizeLocale} from '../../i18n/resolve-strings.js';
import {cx} from '../../lib/cx.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import type {ValueProps,ControlProps,P1InputProps} from '../../types/index.js';
import {FieldControlError,useFieldControl} from '../field/field.js';
export type NumberInputProps=ValueProps<number|null>&ControlProps&P1InputProps&{ref?:Ref<HTMLInputElement>;min?:number;max?:number;step?:number;locale?:string;onDraftChange?:(draft:string)=>void};
const OWNED=['value','defaultValue','onValueChange','label','aria-label','aria-labelledby','nameFromField','description','error','required','aria-describedby','id','disabled','readOnly','className','style','ref','min','max','step','locale','onDraftChange','name'] as const;
function nativeProps(props:NumberInputProps){const rest={...props} as Record<string,unknown>;for(const key of OWNED)delete rest[key];return rest as Omit<NumberInputProps,(typeof OWNED)[number]>;}
function localeOf(locale:string){const tag=normalizeLocale(locale);return tag&&Intl.NumberFormat.supportedLocalesOf(tag).length?tag:'en';}
function formatter(locale:string){return new Intl.NumberFormat(locale,{maximumSignificantDigits:17});}
type Parsed={kind:'valid';value:number|null}|{kind:'partial'|'invalid'};
/** Group boundaries are validated before removing separators; mixed locale punctuation is never guessed. */
function parseDraft(text:string,locale:string):Parsed{
 const parts=formatter(locale).formatToParts(123456789.5),decimal=parts.find(part=>part.type==='decimal')?.value??'.',group=parts.find(part=>part.type==='group')?.value;
 const digitFormat=new Intl.NumberFormat(locale,{useGrouping:false});let normalized=text.trim();
 for(const part of formatter(locale).formatToParts(-1))if(part.type==='literal'&&/^[\u061c\u200e\u200f]+$/u.test(part.value))normalized=normalized.split(part.value).join('');
 for(let digit=0;digit<10;digit++)normalized=normalized.split(digitFormat.format(digit)).join(String(digit));
 const minus=new Intl.NumberFormat(locale).formatToParts(-1).find(part=>part.type==='minusSign')?.value??'-';normalized=normalized.split(minus).join('-');
 if(normalized==='')return {kind:'valid',value:null};
 if(normalized==='-'||normalized==='+'||normalized===decimal||normalized==='-'+decimal||normalized==='+'+decimal)return {kind:'partial'};
 let sign='';if(normalized.startsWith('-')||normalized.startsWith('+')){sign=normalized[0]!;normalized=normalized.slice(1);}
 const halves=normalized.split(decimal);if(halves.length>2)return {kind:'invalid'};
 const integer=halves[0]!,fraction=halves[1];if(fraction!==undefined&&!/^\d*$/u.test(fraction))return {kind:'invalid'};
 let digits=integer;
 if(group&&integer.includes(group)){
  const groups=integer.split(group),reference=parts.filter(part=>part.type==='integer').map(part=>part.value.length),primary=reference.at(-1)??3,secondary=reference.at(-2)??primary;
  if(!groups.every(value=>/^\d+$/u.test(value))||groups.at(-1)!.length!==primary||groups[0]!.length<1||groups[0]!.length>secondary||groups.slice(1,-1).some(value=>value.length!==secondary))return {kind:'invalid'};
  digits=groups.join('');
 }
 if(!/^\d*$/u.test(digits)||(!digits&&!fraction))return {kind:'invalid'};
 if(fraction==='')return {kind:'partial'};
 const value=Number(sign+(digits||'0')+(fraction===undefined?'':'.'+fraction));return Number.isFinite(value)?{kind:'valid',value}:{kind:'invalid'};
}
export function NumberInput(props:NumberInputProps){
 const {value,defaultValue,onValueChange,disabled,readOnly,ref,min,max,step=1,onDraftChange,className,style,name}=props;
 const scope=useNovaScope(),report=useDiagnostics('NumberInput'),control=useFieldControl(props,{component:'NumberInput'}),errorId=useId();
 const locale=localeOf(props.locale??scope.locale);
 const [current,setValue,resetValue]=useControllableValue<number|null>({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
 const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined);
 const textOf=useCallback((number:number|null)=>number===null?'':Number.isFinite(number)?formatter(locale).format(number):'',[locale]);
 const [draft,setDraft]=useState(()=>({model:current,proposed:current,locale,text:textOf(current),blurred:false}));
 if(!Object.is(draft.model,current)||draft.locale!==locale)setDraft({model:current,proposed:current,locale,text:draft.locale===locale&&Object.is(draft.proposed,current)?draft.text:textOf(current),blurred:false});
 const parsed=parseDraft(draft.text,locale),configurationInvalid=(current!==null&&!Number.isFinite(current))||!Number.isFinite(step)||step<=0||(min!==undefined&&!Number.isFinite(min))||(max!==undefined&&!Number.isFinite(max))||(min!==undefined&&max!==undefined&&min>max);
 useEffect(()=>{if(configurationInvalid)report('NOVA_NUMBER_INVALID_CONFIGURATION');},[configurationInvalid,report]);
 const inRange=(next:number|null)=>next===null||((min===undefined||next>=min)&&(max===undefined||next<=max));
 const rangeInvalid=parsed.kind==='valid'&&!inRange(parsed.value);
 const invalidDraft=parsed.kind!=='valid'||rangeInvalid,showDraftError=rangeInvalid||parsed.kind==='invalid'||(draft.blurred&&parsed.kind==='partial');
 const errorMessage=scope.strings.forms.invalidNumber??en.forms.invalidNumber!;
 const [input,setInput]=useState<HTMLInputElement|null>(null),[validator,setValidator]=useState<HTMLInputElement|null>(null),composing=useRef(false);
 const connect=useCallback((node:HTMLInputElement|null)=>{setInput(node);if(!node)return;let detach:(()=>void)|undefined;if(typeof ref==='function'){const cleanup=ref(node);detach=typeof cleanup==='function'?cleanup:()=>ref(null);}else if(ref){ref.current=node;detach=()=>{ref.current=null;};}return()=>{setInput(null);detach?.();};},[ref]);
 useLayoutEffect(()=>{input?.setCustomValidity(invalidDraft?errorMessage:'');},[input,invalidDraft,errorMessage]);
 // Public hidden-input ref keeps native constraints distinct from the interaction fallback range.
 const reconcileValidator=useCallback((node:HTMLInputElement|null)=>{if(!node)return;if(min===undefined)node.removeAttribute('min');else node.min=String(min);if(max===undefined)node.removeAttribute('max');else node.max=String(max);},[min,max]);
 const connectValidator=useCallback((node:HTMLInputElement|null)=>{reconcileValidator(node);setValidator(node);},[reconcileValidator]);
 useLayoutEffect(()=>{reconcileValidator(validator);});
 const reset=useCallback(()=>{resetValue(initial);if(!Object.is(current,initial))onValueChange?.(initial);setDraft({model:initial,proposed:initial,locale,text:textOf(initial),blurred:false});},[initial,current,onValueChange,locale,resetValue,textOf]);
 useNativeFormReset(input,props.form,()=>{if(!controlled)reset();});
 const native=nativeProps(props);
 function edit(text:string){if(disabled||readOnly)return;onDraftChange?.(text);const next=parseDraft(text,locale);setDraft(previous=>({...previous,text,proposed:next.kind==='valid'&&inRange(next.value)?next.value:previous.proposed,blurred:false}));if(!composing.current&&next.kind==='valid'&&inRange(next.value))setValue(next.value);}
 if(!control.ok)return <FieldControlError code={control.code} component="NumberInput"/>;
 if(configurationInvalid)return <span className="nova-config-error" data-nova-config-error="NOVA_NUMBER_INVALID_CONFIGURATION">{scope.strings.forms.configurationError}</span>;
 return control.wrap(<><Primitive.Root className={cx('nova-number-input',className)} style={style} id={control.id} name={current===null?undefined:name} form={props.form} inputRef={connectValidator} value={current} onValueChange={(next,details)=>{if(disabled||readOnly||next!==null&&!Number.isFinite(next)){details.cancel();return;}const text=textOf(next);if(!inRange(next)){details.cancel();setDraft(previous=>({...previous,text,blurred:false}));onDraftChange?.(text);return;}setDraft({model:current,proposed:next,locale,text,blurred:false});onDraftChange?.(text);setValue(next);}} min={min??-Number.MAX_VALUE} max={max??Number.MAX_VALUE} step={step} locale={locale} allowOutOfRange allowWheelScrub={false} disabled={disabled} readOnly={readOnly} required={control.required}>
 <Primitive.Input ref={connect} render={primitive=><input {...primitive} {...native} ref={primitive.ref} className="nova-input nova-number-input__input" value={draft.text} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={[control.ariaDescribedby,showDraftError?errorId:undefined].filter(Boolean).join(' ')||undefined} aria-invalid={control.invalid||showDraftError||undefined} aria-roledescription={scope.strings.forms.numberInputRole??en.forms.numberInputRole}
 onInput={event=>{native.onInput?.(event);if(!event.defaultPrevented)edit(event.currentTarget.value);}}
 onChange={event=>{if(event.nativeEvent.type!=='input')edit(event.currentTarget.value);}}
 onFocus={event=>{primitive.onFocus?.(event);native.onFocus?.(event);}}
 onBlur={event=>{native.onBlur?.(event);if(!event.defaultPrevented)setDraft(previous=>({...previous,blurred:true}));}}
 onCompositionStart={event=>{composing.current=true;native.onCompositionStart?.(event);}}
 onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);if(!event.defaultPrevented&&!disabled&&!readOnly){const next=parseDraft(event.currentTarget.value,locale);if(next.kind==='valid'&&inRange(next.value))setValue(next.value);}}}
 onKeyDown={event=>{native.onKeyDown?.(event);if(event.defaultPrevented||disabled||readOnly||composing.current||event.nativeEvent.isComposing||event.keyCode===229)return;if(event.key==='ArrowUp'||event.key==='ArrowDown'||(event.key==='Home'&&min!==undefined)||(event.key==='End'&&max!==undefined))primitive.onKeyDown?.(event);}} onPaste={native.onPaste}/>}/>
 <Primitive.Decrement className="nova-number-input__step" aria-label={scope.strings.forms.decreaseNumber??en.forms.decreaseNumber}>−</Primitive.Decrement><Primitive.Increment className="nova-number-input__step" aria-label={scope.strings.forms.increaseNumber??en.forms.increaseNumber}>+</Primitive.Increment>
 </Primitive.Root>{showDraftError&&<p className="nova-field__error" id={errorId}>{errorMessage}</p>}</>);
}
