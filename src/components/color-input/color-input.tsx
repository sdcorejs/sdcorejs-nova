'use client';
import {useCallback,useId,useLayoutEffect,useRef,useState,type Ref} from 'react';
import type {ValueProps,ControlProps} from '../../types/index.js';
import {cx} from '../../lib/cx.js';
import {useControllableValue,useFormReset} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import {FieldControlError,useFieldControl} from '../field/field.js';

export type ColorInputProps=ValueProps<string|null>&ControlProps&{
 alpha?:boolean;
 /** The composite container, for consumer measurement. */
 ref?:Ref<HTMLElement>;
 /** The primary text input, for consumer focus and validation. */
 focusRef?:Ref<HTMLElement>;
};
const messages={
 en:{colorPicker:'Choose color (RGB)',colorClear:'Clear color',colorInvalid:'Enter a color as #RRGGBB.',colorInvalidAlpha:'Enter a color as #RRGGBB or #RRGGBBAA.'},
 vi:{colorPicker:'Chọn màu (RGB)',colorClear:'Xóa màu',colorInvalid:'Nhập màu theo dạng #RRGGBB.',colorInvalidAlpha:'Nhập màu theo dạng #RRGGBB hoặc #RRGGBBAA.'},
};
type ColorMessages=typeof messages.en;
function parse(text:string,alpha:boolean):string|null|undefined{
 if(text==='')return null;
 return (/^#[\da-f]{6}$/iu.test(text)||(alpha&&/^#[\da-f]{8}$/iu.test(text)))?text.toUpperCase():undefined;
}

/** Preserve React 19 callback cleanup and legacy null-on-detach refs. */
function attachColorRef(ref:Ref<HTMLElement>|undefined,node:HTMLElement):(()=>void)|undefined{
 if(typeof ref==='function'){
  const cleanup=ref(node);
  return typeof cleanup==='function'?cleanup:()=>ref(null);
 }
 if(ref){ref.current=node;return ()=>{ref.current=null;};}
 return undefined;
}

/** The text draft is transient UI state. Only the value contract owns the committed color. */
export function ColorInput(props:ColorInputProps){
 const {value,defaultValue,onValueChange,alpha=false,disabled,readOnly,className,style,name,onFocus,onBlur,title}=props;
 const scope=useNovaScope(),report=useDiagnostics('ColorInput'),control=useFieldControl(props,{component:'ColorInput'});
 const fallback=scope.locale.toLowerCase().startsWith('vi')?messages.vi:messages.en;
 const strings:typeof scope.strings.forms&Partial<ColorMessages>=scope.strings.forms;
 const message=(key:keyof ColorMessages)=>strings[key]??fallback[key];
 const [current,setValue,resetValue]=useControllableValue<string|null>({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
 const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined);
 const [draft,setDraft]=useState({model:current,text:current??''});
 if(!Object.is(draft.model,current))setDraft({model:current,text:current??''});
 const [input,setInput]=useState<HTMLInputElement|null>(null),composing=useRef(false),errorId=useId();
 const connectRoot=useCallback((node:HTMLDivElement|null)=>{if(node)return attachColorRef(props.ref,node);},[props.ref]);
 const connectInput=useCallback((node:HTMLInputElement|null)=>{
  setInput(node);
  if(!node)return;
  const cleanup=attachColorRef(props.focusRef,node);
  return ()=>{setInput(null);cleanup?.();};
 },[props.focusRef]);
 const invalid=parse(draft.text,alpha)===undefined,invalidMessage=message(alpha?'colorInvalidAlpha':'colorInvalid');
 useLayoutEffect(()=>{input?.setCustomValidity(invalid?invalidMessage:'');},[input,invalid,invalidMessage]);
 const reset=useCallback(()=>{if(!controlled){resetValue(initial);setDraft({model:initial,text:initial??''});}else setDraft({model:current,text:current??''});composing.current=false;},[controlled,current,initial,resetValue]);
 useFormReset(input,reset);
 const canonical=current===null?null:parse(current,alpha);
 const rgb=typeof canonical==='string'?canonical.slice(0,7):'#000000';
 function propose(next:string|null){
  if(disabled||readOnly)return;
  if(!Object.is(next,current))setValue(next);
  setDraft({model:controlled?current:next,text:(controlled?current:next)??''});
 }
 function commit(){if(disabled||readOnly||composing.current)return;const next=parse(draft.text,alpha);if(next!==undefined)propose(next);}
 if(!control.ok)return <FieldControlError code={control.code} component="ColorInput"/>;
 return control.wrap(<><div ref={connectRoot} className={cx('nova-color-input',className)} style={style}>
  <input ref={connectInput} className="nova-input nova-color-input__text" type="text" id={control.id} value={draft.text} disabled={disabled} readOnly={readOnly} required={control.required} title={title}
   aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={[control.ariaDescribedby,invalid?errorId:undefined].filter(Boolean).join(' ')||undefined} aria-invalid={control.invalid||invalid||undefined} spellCheck={false} autoComplete="off"
   onFocus={onFocus} onBlur={event=>{onBlur?.(event);if(!event.defaultPrevented)commit();}}
   onChange={event=>{if(!disabled&&!readOnly)setDraft({model:current,text:event.currentTarget.value});}}
   onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
   onKeyDown={event=>{if(event.key==='Enter'&&!composing.current&&!event.nativeEvent.isComposing&&event.keyCode!==229){event.preventDefault();commit();}}}/>
  <span className="nova-color-input__native"><input className="nova-color-input__picker" type="color" value={rgb} disabled={disabled} aria-readonly={readOnly||undefined} aria-label={message('colorPicker')} title={title} onFocus={onFocus} onBlur={onBlur}
   onClick={event=>{if(readOnly)event.preventDefault();}} onKeyDown={event=>{if(readOnly&&/^(?:Enter| |Arrow(?:Up|Down|Left|Right)|Home|End|PageUp|PageDown|Backspace|Delete)$/u.test(event.key))event.preventDefault();}}
   onChange={event=>{const next=parse(event.currentTarget.value,false);if(typeof next==='string')propose(next+(alpha&&typeof canonical==='string'&&canonical.length===9?canonical.slice(7):''));}}/>
   <span className="nova-color-input__swatch" aria-hidden="true"/>
  </span>
  <button type="button" className="nova-color-input__clear" disabled={disabled||readOnly} onClick={()=>{propose(null);input?.focus();}}>{message('colorClear')}</button>
  {name?<input type="hidden" name={name} value={current??''} disabled={disabled}/>:null}
 </div>{invalid?<p className="nova-field__error" id={errorId}>{invalidMessage}</p>:null}</>);
}
