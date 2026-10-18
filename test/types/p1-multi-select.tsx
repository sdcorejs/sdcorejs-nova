import {createRef} from 'react';
import {MultiSelect,ChipInput} from '@sdcorejs/nova/multi-select';
const options=[{key:0,label:'Zero',data:{id:1}}];
<MultiSelect label="Pick" options={options} value={[0]} onValueChange={next=>{const values:readonly number[]=next;void values;}} renderOption={raw=>raw.id} ref={createRef<HTMLInputElement>()} form="edit" onCompositionEnd={event=>event.currentTarget.value}/>;
<ChipInput nameFromField defaultValue={['a']} name="tag" form="edit" ref={createRef<HTMLInputElement>()} autoComplete="off" inputMode="text" normalize={text=>text.trim()} validate={text=>text.length>30?'Long':undefined}/>;
<ChipInput aria-label="Tags" value={[]} onValueChange={next=>{const values:readonly string[]=next;void values;}}/>;
// @ts-expect-error accessible name is required
<MultiSelect options={options}/>;
// @ts-expect-error controlled array requires callback
<MultiSelect label="Pick" options={options} value={[0]}/>;
// @ts-expect-error numeric option model cannot infer a string from the model
<MultiSelect label="Pick" options={options} value={['0']} onValueChange={()=>{}}/>;
// @ts-expect-error controlled and uncontrolled modes are exclusive
<ChipInput label="Tags" value={[]} defaultValue={[]} onValueChange={()=>{}}/>;
// @ts-expect-error Field owns required and description
<ChipInput nameFromField required description="Help"/>;
// @ts-expect-error actual ref is an input
<MultiSelect label="Pick" options={options} ref={createRef<HTMLButtonElement>()}/>;
// @ts-expect-error chips are strings
<ChipInput label="Tags" defaultValue={[0]}/>;
// @ts-expect-error managed value forbids native onChange
<ChipInput label="Tags" onChange={()=>{}}/>;
// @ts-expect-error controlled chips require callback
<ChipInput label="Tags" value={[]}/>;
