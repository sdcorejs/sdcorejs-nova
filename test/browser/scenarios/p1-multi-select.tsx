/// <reference types="vite/client" />
import {useState} from 'react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {NovaProvider} from '../../../src/providers/nova/index.js';
import {MultiSelect,ChipInput} from '../../../src/components/multi-select/index.js';
import type {Option} from '../../../src/components/select/select.js';
import {generateTokensCss} from '../../../src/tokens/tokens.js';
import '../../../src/styles/base.css';
import '../../../src/styles/components/field.css';
import '../../../src/styles/components/multi-select.css';
const options:readonly Option<number,string|number>[]=[{key:0,label:'Zero',data:1},{key:'0',label:'String zero',data:2},{key:'blocked',label:'Blocked',data:3,disabled:true}];
export default function MultiSelectScenario(){const [theme,setTheme]=useState<'light'|'dark'>('light'),[submitted,setSubmitted]=useState(''),[proposals,setProposals]=useState('');return <NovaProvider locale="en" theme={theme}><style>{generateTokensCss()}</style><main style={{maxWidth:420,padding:16}}><button type="button" onClick={()=>setTheme(previous=>previous==='light'?'dark':'light')}>Toggle theme</button><form id="collections" onSubmit={event=>{event.preventDefault();setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));}}><ChipInput label="Tags" name="tag" required maxItems={2} normalize={text=>text.trim().toLowerCase()} validate={text=>text==='bad'?'Invalid tag':undefined}/><MultiSelect label="Choices" options={options} defaultValue={[0,'blocked']} name="pick" maxSelected={3}/><ChipInput label="Wrapped tags" defaultValue={['Nhãn tiếng Việt dài giúp kiểm chứng xuống dòng trên màn hình nhỏ','second long visible tag']} readOnly/><ChipInput label="Controlled tags" value={['owned']} onValueChange={next=>setProposals(JSON.stringify(next))}/><button type="submit">Submit</button><button type="reset">Reset</button></form><ChipInput label="External tags" defaultValue={['external']} name="external" form="collections"/><output aria-label="Submitted values">{submitted}</output><output aria-label="Proposed values">{proposals}</output></main></NovaProvider>;}


export function mount(container:HTMLElement){const tree=<MultiSelectScenario/>;container.innerHTML=renderToString(tree);hydrateRoot(container,tree);}
