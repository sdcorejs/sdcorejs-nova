'use client';
import { useCallback, useEffect, useRef, useState, type Ref } from 'react';

import { en } from '../../i18n/en.js';
import {useNativeFormReset} from '../../lib/p1-async-lifecycle.js';
import { cx } from '../../lib/cx.js';
import { Icon } from '../../lib/icons.js';
import { reportDiagnostic } from '../../lib/diagnostics.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import type { ControlProps, P1InputProps, SurfaceProps, ValueProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from '../field/field.js';

export type InlineTextProps = ValueProps<string> & ControlProps & P1InputProps & SurfaceProps & {ref?:Ref<HTMLInputElement>;minChars?:number;chrome?:'standalone'|'seamless';clearable?:boolean;onEnter?:()=>void;onEscape?:()=>void};
const OWNED=['value','defaultValue','onValueChange','label','aria-label','aria-labelledby','nameFromField','description','error','required','aria-describedby','id','disabled','readOnly','className','style','ref','minChars','chrome','clearable','onEnter','onEscape','data-testid'] as const;
function nativeProps(props:InlineTextProps): Omit<InlineTextProps,(typeof OWNED)[number]> {
  const native={...props} as Record<string,unknown>;
  for(const key of OWNED)delete native[key];
  return native as Omit<InlineTextProps,(typeof OWNED)[number]>;
}

export function InlineText(props:InlineTextProps) {
  const {value,defaultValue,onValueChange,disabled,readOnly,ref,minChars=2,chrome='standalone',clearable=false,onEnter,onEscape,className,style,'data-testid':testId}=props;
  const scope=useNovaScope(),report=useDiagnostics('InlineText');
  const control=useFieldControl(props,{component:'InlineText'});
  const [current,setValue,resetValue]=useControllableValue({value,defaultValue,onValueChange,fallback:'',disabled,readOnly,report});
  const [initial]=useState(defaultValue ?? ''),[controlled]=useState(value !== undefined);
  const [input,setInput]=useState<HTMLInputElement|null>(null),composing=useRef(false);
  const connect=useCallback((node:HTMLInputElement|null) => {
    setInput(node);if(!node)return;
    let detach:(()=>void)|undefined;
    if(typeof ref==='function') {const cleanup=ref(node);detach=typeof cleanup==='function'?cleanup:()=>ref(null);}
    else if(ref) {ref.current=node;detach=()=>{ref.current=null;};}
    return ()=>{setInput(null);detach?.();};
  },[ref]);
  useNativeFormReset(input,props.form,()=>{
    if(controlled || current===initial)return;
    resetValue(initial);onValueChange?.(initial);
  });
  const validSize=Number.isFinite(minChars)&&minChars>=2,size=validSize?Math.floor(minChars):2;
  useEffect(()=>{if(!validSize)reportDiagnostic(scope.diagnostics,'NOVA_INLINE_TEXT_INVALID_MIN_CHARS','InlineText');},[validSize,scope.diagnostics]);
  const native=nativeProps(props);
  if(!control.ok)return <FieldControlError code={control.code} component="InlineText"/>;
  return control.wrap(
    <span className={cx('nova-inline-text',`nova-inline-text--${chrome}`,clearable && !disabled && !readOnly && 'nova-inline-text--clearable',className)} style={style} data-testid={testId}>
      <input {...native} ref={connect} id={control.id} type="text" size={size} value={current} className="nova-input nova-inline-text__input"
        disabled={disabled} readOnly={readOnly} required={control.required || undefined} aria-label={control.ariaLabel} aria-labelledby={control.ariaLabelledby} aria-describedby={control.ariaDescribedby} aria-invalid={control.invalid || undefined}
        onInput={event=>{native.onInput?.(event);if(!event.defaultPrevented)setValue(event.currentTarget.value);}}
        onChange={event=>{if(event.nativeEvent.type!=='input')setValue(event.currentTarget.value);}}
        onCompositionStart={event=>{composing.current=true;native.onCompositionStart?.(event);}}
        onCompositionEnd={event=>{composing.current=false;native.onCompositionEnd?.(event);}}
        onKeyDown={event=>{
          native.onKeyDown?.(event);
          if(event.defaultPrevented || disabled || readOnly || composing.current || event.nativeEvent.isComposing || event.keyCode===229)return;
          if(event.key==='Enter')onEnter?.();else if(event.key==='Escape')onEscape?.();
        }}/>
      {clearable && current!=='' && !disabled && !readOnly && <button className="nova-inline-text__clear" type="button" aria-label={scope.strings.forms.clear ?? en.forms.clear} aria-controls={control.id} onMouseDown={event=>event.preventDefault()} onClick={()=>{setValue('');input?.focus();}}><Icon name="close"/></button>}
    </span>,
  );
}
