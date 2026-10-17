import {P2Demo} from './p2-demo.jsx';
import {P2Geometry} from './p2-geometry.jsx';
// Consumer page built only from the public subpaths of the packed tarball.
import { useState } from 'react';

import { Alert } from '@sdcorejs/nova/alert';
import { Avatar, AvatarGroup } from '@sdcorejs/nova/avatar';
import { Badge } from '@sdcorejs/nova/badge';
import { Breadcrumb } from '@sdcorejs/nova/breadcrumb';
import { Button, ButtonGroup } from '@sdcorejs/nova/button';
import { Card, Section } from '@sdcorejs/nova/card';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { DataState, Progress } from '@sdcorejs/nova/data-state';
import { Field, focusFirstInvalid } from '@sdcorejs/nova/field';
import { Input } from '@sdcorejs/nova/input';
import { Link } from '@sdcorejs/nova/link';
import { RadioGroup } from '@sdcorejs/nova/radio-group';
import { Switch } from '@sdcorejs/nova/switch';
import { NovaProvider } from '@sdcorejs/nova/theme';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';


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

export function App() {
  const [theme, setTheme] = useState('light');
  const [clicks, setClicks] = useState(0);
  const [dismisses, setDismisses] = useState(0);
  const [formData, setFormData] = useState(null);

  const onSubmit = (event) => {
    event.preventDefault();
    focusFirstInvalid(event.currentTarget);
    setFormData(JSON.stringify([...new FormData(event.currentTarget).entries()]));
  };

  return (
    <NovaProvider theme={theme} locale="vi">
      <main data-testid="nova-app" className="fixture-surface">
        <Breadcrumb items={[{ id: 'home', label: 'Trang chủ', href: '/' }, { id: 'here', label: 'Fixture Vite' }]} />
        <ButtonGroup label="Giao diện">
          <Button variant="secondary" onClick={() => setTheme('dark')}>Chế độ tối</Button>
          <Button variant="secondary" onClick={() => setTheme('light')}>Chế độ sáng</Button>
        </ButtonGroup>
        <Card data-testid="card">
          <Section title="Hồ sơ" actions={<Badge tone="success">Đã xác minh</Badge>}>
            <AvatarGroup label="Thành viên" max={2}>
              <Avatar name="Ảnh" src={PIXEL} />
              <Avatar name="Nguyễn An" />
              <Avatar name="Trần Bình" />
            </AvatarGroup>
            <Progress label="Hoàn thành hồ sơ" value={60} />
            <Link href="https://example.com" target="_blank">Trang ngoài</Link>
          </Section>
        </Card>
        <form onSubmit={onSubmit} noValidate>
          <Field label="Email">
            <Input nameFromField type="email" autoComplete="email" />
          </Field>
          <Checkbox label="Đồng ý điều khoản" name="agree" submissionValue="yes" />
          <Field label="Lựa chọn">
            <RadioGroup nameFromField name="choice" options={[{ value: 1, label: 'Một (số)' }, { value: '1', label: 'Một (chuỗi)' }]} />
          </Field>
          <Switch label="Nhận thông báo" />
          <Button type="submit">Gửi</Button>
        </form>
        <output data-testid="formdata">{formData ?? ''}</output>
        <Button onClick={() => setClicks((count) => count + 1)}>Tăng</Button>
        <output data-testid="clicks">{clicks}</output>
        <Alert tone="info" title="Thông báo" onDismiss={() => setDismisses((count) => count + 1)}>Nội dung thông báo.</Alert>
        <output data-testid="dismisses">{dismisses}</output>
        <DataState state="ready">{0}</DataState>
      <P1Consumer/>
      <P2Demo/>
      {globalThis.location?.pathname==='/p2-geometry'&&<P2Geometry/>}
      </main>
    </NovaProvider>
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
