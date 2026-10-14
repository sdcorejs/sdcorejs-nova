'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode,type Ref} from 'react';
import {Select as S} from '@base-ui/react/select';
import {Combobox as C} from '@base-ui/react/combobox';
import {Autocomplete as A} from '@base-ui/react/autocomplete';
import {useNativeFormReset as useNativeReset} from '../../lib/p1-async-lifecycle.js';
import {en} from '../../i18n/en.js';
import {cx} from '../../lib/cx.js';
import {buildRadioKeyMap,defaultSerializeKey} from '../../lib/radio-key.js';
import {useControllableValue} from '../../lib/use-controllable-value.js';
import {useDiagnostics,useNovaScope} from '../../providers/nova/context.js';
import {PortalScope} from '../../providers/nova/portal-scope.js';
import {FieldControlError,useFieldControl} from '../field/field.js';
import type {ControlProps,Key,P1InputProps,ValueProps} from '../../types/index.js';
export type Option<T,K extends Key>={key:K;label:string;data:T;disabled?:boolean};
type OptionsProps<T,K extends Key>={options:readonly Option<T,K>[];renderOption?:(raw:T)=>ReactNode;loading?:boolean;unresolvedLabel?:(key:K)=>string;clearable?:boolean};
export type SelectProps<T,K extends Key>=ValueProps<NoInfer<K>|null>&ControlProps&OptionsProps<T,K>&{form?:string;ref?:Ref<HTMLButtonElement>};
type QueryProps={query:string;defaultQuery?:never;onQueryChange:(query:string)=>void}|{query?:never;defaultQuery?:string;onQueryChange?:(query:string)=>void};
export type ComboboxProps<T,K extends Key>=ValueProps<NoInfer<K>|null>&ControlProps&P1InputProps&OptionsProps<T,K>&QueryProps&{ref?:Ref<HTMLInputElement>};
export type AutocompleteProps=ValueProps<string>&ControlProps&P1InputProps&{ref?:Ref<HTMLInputElement>;suggestions:readonly string[];loading?:boolean};
const OWNED=['value','defaultValue','onValueChange','label','aria-label','aria-labelledby','nameFromField','description','error','required','aria-describedby','id','disabled','readOnly','className','style','ref','name','options','renderOption','loading','unresolvedLabel','clearable','query','defaultQuery','onQueryChange','suggestions'] as const;
function nativeProps(props:object){const rest={...props} as Record<string,unknown>;for(const key of OWNED)delete rest[key];return rest as P1InputProps;}
function attachRef<E>(ref:Ref<E>|undefined,node:E){if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>ref(null);}if(ref){ref.current=node;return()=>{ref.current=null;};}return undefined;}
function useControlRef<E extends HTMLElement>(ref:Ref<E>|undefined){const [node,setNode]=useState<E|null>(null);const connect=useCallback((element:E|null)=>{setNode(element);if(!element)return;const cleanup=attachRef(ref,element);return()=>{setNode(null);cleanup?.();};},[ref]);return [node,connect] as const;}
function useOptions<T,K extends Key>(options:readonly Option<T,K>[],value:K|null,unresolvedLabel:((key:K)=>string)|undefined){
 const report=useDiagnostics('Select'),scope=useNovaScope();
 const keys=buildRadioKeyMap(options.map(option=>({value:option.key})));
 const badValue=typeof value==='number'&&!Number.isFinite(value);
 const code=badValue?'NOVA_SELECT_NONFINITE_KEY':keys.ok?null:keys.code==='NOVA_RADIO_DUPLICATE_KEY'?'NOVA_SELECT_DUPLICATE_KEY':'NOVA_SELECT_NONFINITE_KEY';
 useEffect(()=>{if(code)report(code);},[code,report]);
 const labelOf=useCallback((key:K)=>options.find(option=>Object.is(option.key,key))?.label??unresolvedLabel?.(key)??(scope.strings.forms.unresolvedSelection??en.forms.unresolvedSelection!),[options,unresolvedLabel,scope.strings.forms.unresolvedSelection]);
 return {code,labelOf};
}
/** Native inherited disabled state remains nonfocusable without changing primitive internals. */
function OptionContainer({disabled,children}:{disabled:boolean|undefined;children:ReactNode}){return disabled?<fieldset disabled className="nova-select__disabled-option">{children}</fieldset>:<>{children}</>;}
function Clear({disabled,onClear}:{disabled:boolean|undefined;onClear:()=>void}){const scope=useNovaScope();return <button className="nova-select__clear" type="button" disabled={disabled} aria-label={scope.strings.forms.clearSelection??en.forms.clearSelection} onClick={onClear}>×</button>;}
function State({loading,empty}:{loading:boolean|undefined;empty:boolean}){const scope=useNovaScope();return <p role="status" aria-live="polite" aria-atomic="true" className="nova-select__status">{loading?scope.strings.feedback.loading:empty?(scope.strings.forms.noResults??en.forms.noResults):null}</p>;}
function FilteredState({loading}:{loading:boolean|undefined}){const items=C.useFilteredItems<unknown>();return <State loading={loading} empty={items.length===0}/>;}
export function Select<T,K extends Key>(props:SelectProps<T,K>){
 const {value,defaultValue,onValueChange,options,renderOption,disabled,readOnly,loading,unresolvedLabel,clearable,ref,name,form,className,style}=props;
 const control=useFieldControl(props,{component:'Select'}),report=useDiagnostics('Select'),scope=useNovaScope();
 const [current,setValue,resetValue]=useControllableValue<K|null>({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
 const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined),[input,setInput]=useState<HTMLInputElement|null>(null),[trigger,connect]=useControlRef(ref),[popup,setPopup]=useState<HTMLDivElement|null>(null);
 const reset=useCallback(()=>{if(!controlled){resetValue(initial);if(!Object.is(current,initial))onValueChange?.(initial);}},[resetValue,initial,controlled,current,onValueChange]);useNativeReset(input,form,reset);
 const {code,labelOf}=useOptions(options,current,unresolvedLabel);
 if(!control.ok)return <FieldControlError code={control.code} component="Select"/>;
 if(code)return <span className="nova-config-error" data-nova-config-error={code}>{scope.strings.forms.configurationError}</span>;
 return control.wrap(<S.Root<K> onOpenChangeComplete={open=>{if(!open||!popup?.isConnected||!options.find(option=>Object.is(option.key,current))?.disabled)return;const active=popup.ownerDocument.activeElement;if(active!==trigger&&!popup.contains(active))return;if(active instanceof popup.ownerDocument.defaultView!.HTMLElement&&active.getAttribute('role')==='option'&&!active.matches(':disabled'))return;popup.querySelector<HTMLElement>('[role="option"]:not(:disabled)')?.focus();}} value={current} onValueChange={(next,details)=>{if(disabled||readOnly||next!==null&&options.find(option=>Object.is(option.key,next))?.disabled){details.cancel();return;}setValue(next);}} name={current===null?undefined:name} form={form} inputRef={setInput} required={control.required} disabled={disabled} readOnly={readOnly} itemToStringValue={defaultSerializeKey} itemToStringLabel={labelOf} items={options.map(option=>({value:option.key,label:option.label}))}>
 <span className={cx('nova-select__control',className)} style={style}><S.Trigger ref={connect} id={control.id} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid||undefined} aria-required={control.required||undefined} onFocus={props.onFocus} onBlur={props.onBlur} className="nova-input nova-select__trigger">{current===null?(scope.strings.forms.selectPlaceholder??en.forms.selectPlaceholder):labelOf(current)}<span aria-hidden="true">⌄</span></S.Trigger>{clearable&&current!==null&&!readOnly&&<Clear disabled={disabled} onClear={()=>{setValue(null);trigger?.focus();}}/>}</span>
 <PortalScope modal>{(container,portalRef)=><S.Portal container={container} ref={portalRef}><S.Positioner alignItemWithTrigger={false} sideOffset={4} collisionPadding={16} className="nova-select__positioner"><S.Popup ref={setPopup} className="nova-select__popup"><State loading={loading} empty={options.length===0}/><S.List>{options.map(option=><OptionContainer key={defaultSerializeKey(option.key)} disabled={option.disabled}><S.Item value={option.key} label={option.label} disabled={option.disabled} nativeButton={!!option.disabled} render={option.disabled?(primitive)=><button {...primitive} ref={primitive.ref as Ref<HTMLButtonElement>} type="button" disabled/>:undefined} aria-label={option.label} className="nova-select__option"><S.ItemText>{renderOption?renderOption(option.data):option.label}</S.ItemText><S.ItemIndicator aria-hidden="true">✓</S.ItemIndicator></S.Item></OptionContainer>)}</S.List></S.Popup></S.Positioner></S.Portal>}</PortalScope>
 </S.Root>);
}
export function Combobox<T,K extends Key>(props:ComboboxProps<T,K>){
 const {value,defaultValue,onValueChange,query,defaultQuery,onQueryChange,options,renderOption,disabled,readOnly,loading,unresolvedLabel,clearable,ref,name,className,style}=props;
 const control=useFieldControl(props,{component:'Combobox'}),report=useDiagnostics('Combobox'),scope=useNovaScope();
 const [current,setValue,resetValue]=useControllableValue<K|null>({value,defaultValue,onValueChange,fallback:null,disabled,readOnly,report});
 const {code,labelOf}=useOptions(options,current,unresolvedLabel);
 const [text,setText,resetText]=useControllableValue<string>({value:query,defaultValue:defaultQuery,onValueChange:onQueryChange,fallback:current===null?'':labelOf(current),disabled,readOnly,report});
 const [initial]=useState(defaultValue??null),[controlled]=useState(value!==undefined),[initialQuery]=useState(defaultQuery??(initial===null?'':labelOf(initial))),[input,setInput]=useState<HTMLInputElement|null>(null),[visible,connect]=useControlRef(ref);
 const modelLabel=current===null?'':labelOf(current),[association,setAssociation]=useState({model:current,label:modelLabel});
 if(!Object.is(association.model,current)||association.label!==modelLabel){setAssociation({model:current,label:modelLabel});if(query===undefined&&(!Object.is(association.model,current)||(defaultQuery===undefined&&text===association.label)))resetText(modelLabel);}
 const reset=useCallback(()=>{if(controlled)return;resetValue(initial);if(!Object.is(current,initial))onValueChange?.(initial);resetText(initialQuery);setAssociation({model:initial,label:initial===null?'':labelOf(initial)});},[resetValue,resetText,initial,initialQuery,labelOf,setAssociation,controlled,current,onValueChange]);useNativeReset(input,props.form,reset);
 const composing=useRef(false),native=nativeProps(props);
 if(!control.ok)return <FieldControlError code={control.code} component="Combobox"/>;
 if(code)return <span className="nova-config-error" data-nova-config-error={code}>{scope.strings.forms.configurationError}</span>;
 return control.wrap(<C.Root<K> items={options.map(option=>option.key)} value={current} onValueChange={(next,details)=>{if(disabled||readOnly||details.reason==='escape-key'||next!==null&&options.find(option=>Object.is(option.key,next))?.disabled){details.cancel();return;}setValue(next);}} inputValue={text} onInputValueChange={(next,details)=>{if(disabled||readOnly||details.reason==='escape-key'){details.cancel();return;}setText(next);}} itemToStringLabel={labelOf} itemToStringValue={defaultSerializeKey} autoHighlight name={current===null?undefined:name} form={props.form} inputRef={setInput} required={control.required} disabled={disabled} readOnly={readOnly}>
 <span className={cx('nova-select__control',className)} style={style}><C.Input {...native} ref={connect} id={control.id} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid||undefined} className="nova-input" onCompositionStart={event=>{composing.current=true;native.onCompositionStart?.(event);}} onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);}} onKeyDown={event=>{native.onKeyDown?.(event);if(composing.current||event.nativeEvent.isComposing||event.keyCode===229){event.preventDefault();}}}/>{clearable&&current!==null&&!readOnly&&<Clear disabled={disabled} onClear={()=>{setValue(null);setText('');visible?.focus();}}/>}</span>
 <PortalScope>{(container,portalRef)=><C.Portal container={container} ref={portalRef}><C.Positioner sideOffset={4} collisionPadding={16} className="nova-select__positioner"><C.Popup className="nova-select__popup"><FilteredState loading={loading}/><C.List>{(key:K)=>{const option=options.find(option=>Object.is(option.key,key));return option?<OptionContainer key={defaultSerializeKey(key)} disabled={option.disabled}><C.Item value={key} disabled={option.disabled} nativeButton={!!option.disabled} render={option.disabled?(primitive)=><button {...primitive} ref={primitive.ref as Ref<HTMLButtonElement>} type="button" disabled/>:undefined} aria-label={option.label} className="nova-select__option">{renderOption?renderOption(option.data):option.label}</C.Item></OptionContainer>:null;}}</C.List></C.Popup></C.Positioner></C.Portal>}</PortalScope>
 </C.Root>);
}
export function Autocomplete(props:AutocompleteProps){
 const {value,defaultValue,onValueChange,suggestions,disabled,readOnly,loading,ref,name,className,style}=props;
 const control=useFieldControl(props,{component:'Autocomplete'}),report=useDiagnostics('Autocomplete');
 const [current,setValue,resetValue]=useControllableValue<string>({value,defaultValue,onValueChange,fallback:'',disabled,readOnly,report});
 const [initial]=useState(defaultValue??''),[controlled]=useState(value!==undefined),[input,connect]=useControlRef(ref),composing=useRef(false),native=nativeProps(props);
 const reset=useCallback(()=>{if(!controlled){resetValue(initial);if(!Object.is(current,initial))onValueChange?.(initial);}},[resetValue,initial,controlled,current,onValueChange]);useNativeReset(input,props.form,reset);
 if(!control.ok)return <FieldControlError code={control.code} component="Autocomplete"/>;
 return control.wrap(<A.Root<string> items={suggestions} value={current} onValueChange={(next,details)=>{if(disabled||readOnly||details.reason==='escape-key'){details.cancel();return;}setValue(next);}} name={name} form={props.form} required={control.required} disabled={disabled} readOnly={readOnly} mode="list">
 <A.Input {...native} ref={connect} id={control.id} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid||undefined} className={cx('nova-input',className)} style={style} onCompositionStart={event=>{composing.current=true;native.onCompositionStart?.(event);}} onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);}} onKeyDown={event=>{native.onKeyDown?.(event);if(composing.current||event.nativeEvent.isComposing||event.keyCode===229)event.preventDefault();}}/>
 <PortalScope>{(container,portalRef)=><A.Portal container={container} ref={portalRef}><A.Positioner sideOffset={4} collisionPadding={16} className="nova-select__positioner"><A.Popup className="nova-select__popup"><FilteredState loading={loading}/><A.List>{(item:string)=><A.Item key={item} value={item} className="nova-select__option">{item}</A.Item>}</A.List></A.Popup></A.Positioner></A.Portal>}</PortalScope>
 </A.Root>);
}
