import type {Ref,RefObject} from 'react';
import {ColorInput,type ColorInputProps} from '@sdcorejs/nova/color-input';
import {ColorInput as RootColorInput} from '@sdcorejs/nova';
// case-p2-f04-ac01-types: package resolution is a phase 3 integration gate.
const props:ColorInputProps={label:'Color',value:null,onValueChange:next=>{const color:string|null=next;void color;},alpha:true};
<ColorInput {...props}/>;<RootColorInput aria-label="Color" defaultValue="#112233"/>;
// @ts-expect-error controlled value needs a proposal callback
<ColorInput label="Color" value="#112233"/>;
// @ts-expect-error mount modes are exclusive
<ColorInput label="Color" value={null} defaultValue="#112233" onValueChange={()=>{}}/>;
// @ts-expect-error accessible name is mandatory
<ColorInput/>;
// @ts-expect-error accessible name alternatives are exclusive
<ColorInput label="Color" aria-label="Color"/>;
// @ts-expect-error raw native onChange is not the value contract
<ColorInput label="Color" onChange={()=>{}}/>;
// @ts-expect-error native input type is owned
<ColorInput label="Color" type="color"/>;
// @ts-expect-error invalid value type
<ColorInput label="Color" defaultValue={42}/>;
// @ts-expect-error alpha is boolean
<ColorInput label="Color" alpha="native"/>;
// @ts-expect-error Field owns inherited required state
<ColorInput nameFromField required/>;

// F04-REF: consumers can measure the root and focus the semantic text control.
const rootRef:RefObject<HTMLElement|null>={current:null};
const focusRef:RefObject<HTMLElement|null>={current:null};
const cleanupRef:Ref<HTMLElement>=node=>{node?.focus();return ()=>{};};
const legacyRef:Ref<HTMLElement>=node=>{node?.focus();};
const refProps:ColorInputProps={label:'Color',ref:rootRef,focusRef};
<ColorInput {...refProps}/>;<RootColorInput label="Color" ref={cleanupRef} focusRef={legacyRef}/>;
<ColorInput label="Color" ref={null} focusRef={null}/>;
// @ts-expect-error refs accept semantic elements, not numbers
<ColorInput label="Color" ref={42}/>;
// @ts-expect-error focus refs must target semantic elements
<ColorInput label="Color" focusRef="text"/>;
