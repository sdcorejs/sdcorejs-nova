'use client';
// Consumer client boundary: callbacks live here (functions are not serializable
// from a Server Component, architecture §7).
import { useEffect, useState } from 'react';

import { Alert } from '@sdcorejs/nova/alert';
import { Button } from '@sdcorejs/nova/button';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { Field } from '@sdcorejs/nova/field';
import { Input } from '@sdcorejs/nova/input';
import { RadioGroup } from '@sdcorejs/nova/radio-group';
import { useNovaTheme } from '@sdcorejs/nova/theme';


import '@sdcorejs/nova/styles.css';
import {DatePicker} from '@sdcorejs/nova/date-picker';
import {TimeInput} from '@sdcorejs/nova/time-input';
import {DateTimePicker} from '@sdcorejs/nova/date-time-picker';
import {createTemporalAdapter} from '@sdcorejs/nova/adapters/temporal';
import {useNovaController} from '@sdcorejs/nova/adapters/react-hook-form';
import {useForm} from 'react-hook-form';
import {NumberInput} from '@sdcorejs/nova/number-input';
import {Select} from '@sdcorejs/nova/select';
import {MultiSelect,ChipInput} from '@sdcorejs/nova/multi-select';
import {InlineEdit} from '@sdcorejs/nova/inline-edit';
import {Sidebar,Navigation} from '@sdcorejs/nova/app-shell';

export function ClientDemo() {
  const { resolvedTheme } = useNovaTheme();
  const [hydrated, setHydrated] = useState(false);
  const [clicks, setClicks] = useState(0);
  useEffect(() => setHydrated(true), []);

  return (
    <section aria-label="Tương tác">
      <span data-testid="hydrated" data-hydrated={hydrated ? 'true' : 'false'} />
      <output data-testid="resolved-theme">{resolvedTheme}</output>
      <Button onClick={() => setClicks((count) => count + 1)}>Tăng</Button>
      <output data-testid="clicks">{clicks}</output>
      <Field label="Email"><Input nameFromField type="email" autoComplete="email" /></Field>
      <Checkbox label="Đồng ý" name="agree" />
      <RadioGroup label="Lựa chọn" name="choice" options={[{ value: 1, label: 'Một' }, { value: 2, label: 'Hai' }]} />
      <Alert tone="info" title="Thông báo" onDismiss={() => {}}>Nội dung.</Alert>
      <P1Consumer/>
    </section>
  );
}

const p1Adapter=createTemporalAdapter();
function P1Consumer(){
 const [native,setNative]=useState(''),[submitted,setSubmitted]=useState(''),[title,setTitle]=useState('Original'),[revision,setRevision]=useState(1);
 const {control,handleSubmit}=useForm({defaultValues:{name:'',flag:false}});
 const name=useNovaController({control,name:'name',rules:{required:'Name required'}}),flag=useNovaController({control,name:'flag'});
 return <section aria-label="P1 consumer">
  <form aria-label="P1 native" onSubmit={event=>{event.preventDefault();setNative(JSON.stringify([...new FormData(event.currentTarget)]));}}>
   <DatePicker label="P1 date" name="civil" defaultValue="2024-02-29" referenceDate="2024-02-29"/>
   <TimeInput label="P1 time" name="clock" defaultValue="00:00" required/>
   <NumberInput label="P1 number" name="amount" defaultValue={0}/>
   <Select label="P1 choice" name="choice" defaultValue={0} options={[{key:0,label:'Zero',data:0},{key:1,label:'One',data:1}]}/>
   <MultiSelect label="P1 many" name="many" defaultValue={[0,1]} options={[{key:0,label:'Zero',data:0},{key:1,label:'One',data:1}]}/>
   <ChipInput label="P1 tags" name="tags" defaultValue={['Đặng','Nova']}/>
   <Button type="submit">P1 submit native</Button>
  </form><output data-testid="p1-native">{native}</output>
  <form aria-label="P1 controller" onSubmit={handleSubmit(values=>setSubmitted(JSON.stringify(values)))}>
   <Input {...name} label="P1 name"/><Checkbox {...flag} label="P1 flag"/><Button type="submit">P1 submit controller</Button>
  </form><output data-testid="p1-controller">{submitted}</output>
  <DateTimePicker label="P1 instant" referenceDate="2024-03-10" timeZone="America/New_York" adapter={p1Adapter} defaultValue="2024-03-10T06:30:00Z"/>
  <InlineEdit value={title} revision={revision} scopeKey="consumer" display={title} label="P1 title" renderEditor={({draft,setDraft})=><Input label="P1 draft" value={draft} onValueChange={setDraft}/>} onSave={async value=>({value,revision:revision+1})} onCommit={commit=>{setTitle(commit.value);setRevision(commit.revision);}}/>
  <Sidebar label="P1 workspace" triggerLabel="P1 menu"><Navigation label="P1 navigation" currentId="one" items={[{id:'one',label:'P1 current',href:'#one'}]}/><Input label="P1 sidebar draft" defaultValue="Server draft"/></Sidebar>
 </section>;
}
