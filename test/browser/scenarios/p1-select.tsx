import {useState} from 'react';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {Field} from '../../../src/components/field/index.js';
import {Select,Combobox,Autocomplete,type Option} from '../../../src/components/select/index.js';
const options:readonly Option<{id:number},string|number>[]=[{key:0,label:'Zero',data:{id:1}},{key:'0',label:'String zero',data:{id:2}},{key:'',label:'Empty key',data:{id:3}},{key:'blocked',label:'Blocked',data:{id:4},disabled:true}];
export default function SelectionScenario(){
 const [theme,setTheme]=useState<'light'|'dark'>('light'),[submitted,setSubmitted]=useState('');
 return <NovaProvider locale="en" theme={theme}><div style={{maxWidth:420,padding:16}}><button type="button" onClick={()=>setTheme(previous=>previous==='light'?'dark':'light')}>Toggle theme</button><form onSubmit={event=>{event.preventDefault();setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));}}>
 <Field label="Required choice" description="Choose an available option" required><Select nameFromField name="choice" options={options} clearable/></Field>
 <Combobox label="Search choice" name="search" options={options} defaultValue={0} defaultQuery="" clearable/>
 <Autocomplete label="City" suggestions={['Hanoi','Hue']} name="city" defaultValue=""/>
 <button type="submit">Submit</button><button type="reset">Reset</button></form><output aria-label="Submitted values">{submitted}</output></div></NovaProvider>;
}
