'use client';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useEffect, useId } from 'react';
import { en } from '../../i18n/en.js';
import { cx } from '../../lib/cx.js';
import { isEmptyLabel } from '../../lib/accessible-name.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { FieldControlError, useFieldControl } from '../field/field.js';
import type { ReactNode, Ref } from 'react';
import type { ControlProps, SurfaceProps } from '../../types/index.js';
export type SegmentValue=string|number|boolean;
export type SegmentOption<V extends SegmentValue>={value:V;label:string;icon?:ReactNode;disabled?:boolean};
export type SegmentedControlProps<V extends SegmentValue>=ControlProps&SurfaceProps&{ref?:Ref<HTMLButtonElement>;form?:string;items:readonly SegmentOption<V>[];variant?:'light'|'fill'|'outline';orientation?:'horizontal'|'vertical';stretch?:boolean}&({multiple?:false;value:V|null;onValueChange:(value:V|null)=>void;allowEmpty?:boolean}|{multiple:true;value:readonly V[];onValueChange:(value:readonly V[])=>void;allowEmpty?:never});
export function SegmentedControl<V extends SegmentValue>(props:SegmentedControlProps<V>){
  const {items,value,onValueChange,multiple=false,variant='light',orientation='horizontal',stretch=false,disabled,readOnly,name,form,ref,className,style,title,onBlur,onFocus,'data-testid':testId}=props;
  const {strings}=useNovaScope();const report=useDiagnostics('SegmentedControl');const requiredId=useId();
  const control=useFieldControl(props,{component:'SegmentedControl',labelAs:'span'});
  const keys=items.map(item=>encode(item.value));
  const invalidKey=items.some(item=>typeof item.value==='number'&&!Number.isFinite(item.value));
  const duplicate=new Set(keys).size!==keys.length;
  const unnamed=items.some(item=>isEmptyLabel(item.label));
  const code=invalidKey?'NOVA_RADIO_NONFINITE_KEY':duplicate?'NOVA_RADIO_DUPLICATE_KEY':unnamed?'NOVA_ACCESSIBLE_NAME_EMPTY':null;
  useEffect(()=>{if(code)report(code);},[code,report]);
  const chosen=multiple?(value as readonly V[]):value===null?[]:[value as V];
  const unknown=chosen.some(key=>!items.some(item=>item.value===key));
  useEffect(()=>{if(unknown&&!code)report('NOVA_RADIO_UNKNOWN_VALUE');},[unknown,code,report]);
  const selected=items.filter(item=>chosen.some(key=>key===item.value));
  const focusTarget=selected.find(item=>!item.disabled)??items.find(item=>!item.disabled);
  const selectedKeys=selected.map(item=>encode(item.value));
  if(!control.ok)return <FieldControlError code={control.code} component="SegmentedControl"/>;
  if(code)return <FieldControlError code={code} component="SegmentedControl"/>;
  const rootProps={id:control.id,'aria-label':control.ariaLabel,'aria-labelledby':control.ariaLabelledby,'aria-describedby':[control.ariaDescribedby,multiple&&control.required?requiredId:undefined].filter(Boolean).join(' ')||undefined,'aria-invalid':control.invalid||undefined,className:cx('nova-segmented',`nova-segmented--${variant}`,`nova-segmented--${orientation}`,stretch&&'nova-segmented--stretch',className),style,title,onBlur,onFocus,'data-testid':testId,'data-nova-control-root':''};
  const nativeConstraint=control.required&&(multiple||!name)?<input type="checkbox" className="nova-segmented__validation" checked={selected.some(item=>!item.disabled)} required readOnly disabled={disabled} form={form} tabIndex={-1} aria-hidden="true" onInvalid={event=>{event.preventDefault();event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-nova-focus-target]:not(:disabled)')?.focus();}}/>:null;
  const content=items.map((item,index)=>{
    const body=<>{item.icon&&<span aria-hidden="true" className="nova-segmented__icon">{item.icon}</span>}<span className="nova-segmented__label">{item.label}</span></>;
    return multiple?<Toggle key={keys[index]} value={keys[index]} disabled={disabled||item.disabled} aria-disabled={readOnly||undefined} className="nova-segmented__item" ref={item===focusTarget?ref:undefined} data-nova-focus-target="">{body}</Toggle>:<Radio.Root key={keys[index]} value={keys[index]} disabled={disabled||item.disabled} nativeButton render={<button type="button" ref={item===focusTarget?ref:undefined}/>} className="nova-segmented__item" data-nova-focus-target="">{body}</Radio.Root>;
  });
  return control.wrap(<>
    {multiple?<ToggleGroup {...rootProps} value={selectedKeys} multiple disabled={disabled} orientation={orientation} onValueChange={next=>{if(!disabled&&!readOnly)(onValueChange as (values:readonly V[])=>void)(items.filter((_,index)=>next.includes(keys[index]!)).map(item=>item.value));}}>{content}{nativeConstraint}</ToggleGroup>:<BaseRadioGroup {...rootProps} value={selectedKeys[0]??null} name={name} form={form} disabled={disabled} readOnly={readOnly} required={control.required&&!!name} onInvalid={event=>{event.preventDefault();event.currentTarget.querySelector<HTMLButtonElement>('[data-nova-focus-target]:not(:disabled)')?.focus();}} aria-required={control.required||undefined} aria-orientation={orientation} onValueChange={next=>{const index=keys.indexOf(next as string);if(index>=0&&!disabled&&!readOnly&&items[index]!.value!==value)(onValueChange as (next:V|null)=>void)(items[index]!.value);}}>{content}{nativeConstraint}</BaseRadioGroup>}
    {multiple&&control.required&&<span id={requiredId} className="nova-segmented__required">{strings.forms.required}</span>}
    {multiple&&name&&!disabled&&selected.filter(item=>!item.disabled).map(item=><input key={encode(item.value)} type="hidden" name={name} form={form} value={encode(item.value)}/>)}
    {!multiple&&props.allowEmpty&&<button type="button" className="nova-segmented__clear" disabled={disabled||readOnly||value===null} onClick={()=>{(onValueChange as (next:V|null)=>void)(null);}}>{strings.forms.clearSelection??en.forms.clearSelection}</button>}
  </>);
}
function encode(value:SegmentValue):string{return typeof value==='boolean'?`b:${value}`:typeof value==='number'?`n:${value}`:`s:${value}`;}
