import {createRef} from 'react';
import {Select,Combobox,Autocomplete,type Option} from '@sdcorejs/nova/select';
const options:readonly Option<{id:number},number>[]=[{key:0,label:'Zero',data:{id:1}}];
<Select label="Pick" options={options} value={0} onValueChange={value=>{const number:number|null=value;void number;}} ref={createRef<HTMLButtonElement>()} renderOption={raw=>raw.id}/>;
<Combobox nameFromField options={options} defaultValue={0} query="" onQueryChange={()=>{}} ref={createRef<HTMLInputElement>()} form="edit" onCompositionEnd={event=>event.currentTarget.value}/>;
<Autocomplete label="City" suggestions={['Hanoi']} value="Free" onValueChange={text=>text.toUpperCase()} form="edit" autoComplete="off"/>;
// @ts-expect-error accessible name is required independently of value/query state
<Combobox options={options}/>;
// @ts-expect-error controlled selection requires its callback
<Combobox label="Pick" options={options} value={0}/>;
// @ts-expect-error Field owns description
<Combobox nameFromField options={options} description="Owned"/>;
// @ts-expect-error controlled query requires callback
<Combobox label="Pick" options={options} query=""/>;
// @ts-expect-error query modes cannot be mixed
<Combobox label="Pick" options={options} query="" defaultQuery="" onQueryChange={()=>{}}/>;
// @ts-expect-error numeric keys do not accept a string model
<Select label="Pick" options={options} value="0" onValueChange={()=>{}}/>;
// @ts-expect-error trigger is a button
<Select label="Pick" options={options} ref={createRef<HTMLInputElement>()}/>;
// @ts-expect-error controlled autocomplete owns a string callback
<Autocomplete label="City" suggestions={[]} value=""/>;
// @ts-expect-error free-text is a string, not a selected key
<Autocomplete label="City" suggestions={[]} defaultValue={1}/>;
