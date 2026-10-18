import { useState } from 'react';
import { DatePicker,DateRangePicker } from '../../../src/components/date-picker/index.js';
import { NovaProvider } from '../../../src/providers/nova/index.js';
export default function DateScenario(){const [theme,setTheme]=useState<'light'|'dark'>('light');const [result,setResult]=useState('');return <NovaProvider locale="en" theme={theme}><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>Theme</button>
  <form aria-label="Dates" onSubmit={event=>{event.preventDefault();setResult(JSON.stringify([...new FormData(event.currentTarget)]));}}>
    <DatePicker label="Date" name="date" defaultValue="2024-01-31" referenceDate="2024-01-31"/>
    <DateRangePicker label="Range" referenceDate="2024-01-31" names={{start:'start',end:'end'}}/>
    <button type="submit">Submit</button><button type="reset">Reset</button><output aria-label="Submitted">{result}</output>
  </form></NovaProvider>;}
