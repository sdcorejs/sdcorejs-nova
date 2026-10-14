'use client';
import {useCallback,type RefCallback} from 'react';
import {useController,type FieldPath,type FieldPathValue,type FieldValues,type UseControllerProps} from 'react-hook-form';
/** Bind Nova value semantics while keeping the visible focus ref owned by RHF. */
export function useNovaController<TFields extends FieldValues,TName extends FieldPath<TFields>>(options:UseControllerProps<TFields,TName>):{name:TName;value:FieldPathValue<TFields,TName>;onValueChange(value:FieldPathValue<TFields,TName>):void;onBlur():void;ref:RefCallback<HTMLElement>;disabled:boolean;error?:string} {
 const {field,fieldState}=useController(options);
 const {onChange,ref:fieldRef}=field;
 const onValueChange=useCallback((value:FieldPathValue<TFields,TName>)=>onChange(value),[onChange]);
 const ref=useCallback((node:HTMLElement|null)=>{fieldRef(node);},[fieldRef]);
 return {name:field.name,value:field.value,onValueChange,onBlur:field.onBlur,ref,disabled:field.disabled??false,error:fieldState.error?.message};
}
