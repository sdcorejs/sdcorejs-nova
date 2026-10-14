import {createRef} from 'react';
import {NumberInput} from '@sdcorejs/nova/number-input';
import type {NumberInputProps} from '@sdcorejs/nova/number-input';
const ref=createRef<HTMLInputElement>();
<NumberInput label="Amount" value={0} onValueChange={value=>{const finiteOrEmpty:number|null=value;void finiteOrEmpty;}} ref={ref} form="edit" name="amount" autoComplete="off" inputMode="decimal" min={0} max={10} step={0.1} locale="vi" onDraftChange={text=>{const raw:string=text;void raw;}} onInput={event=>event.currentTarget.select()}/>;
<NumberInput nameFromField defaultValue={null} ref={ref}/>;
const standalone:NumberInputProps={'aria-label':'Amount',defaultValue:1,error:'Error'};void standalone;
// @ts-expect-error numeric model needs a proposal callback when controlled
<NumberInput label="Amount" value={2}/>;
// @ts-expect-error visible accessible name is required
<NumberInput defaultValue={0}/>;
// @ts-expect-error Field owns its required metadata
<NumberInput nameFromField required/>;
// @ts-expect-error number model is not a formatted text string
<NumberInput label="Amount" value="2" onValueChange={()=>{}}/>;
// @ts-expect-error native type is owned by the numeric control
<NumberInput label="Amount" type="number"/>;
// @ts-expect-error semantic input ref cannot be a button
<NumberInput label="Amount" ref={createRef<HTMLButtonElement>()}/>;
// @ts-expect-error bounds are finite-number contracts, not arbitrary strings
<NumberInput label="Amount" min="2"/>;
// @ts-expect-error controlled and uncontrolled initialization cannot be mixed
<NumberInput label="Amount" value={2} defaultValue={1} onValueChange={()=>{}}/>;
