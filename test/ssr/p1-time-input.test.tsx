// @vitest-environment jsdom
import {act} from 'react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {TimeInput,TimeRangeInput} from '../../src/components/time-input/index.js';
import {DateTimePicker} from '../../src/components/date-time-picker/index.js';
import {createTemporalAdapter} from '../../src/adapters/temporal/index.js';
it('hydrates explicit-zone time controls without recoverable errors and keeps native midnight payload',async()=>{const tree=<form><TimeInput label="Time" defaultValue="00:00" name="time"/><TimeRangeInput label="Range" defaultValue={{start:'23:00',end:'01:00'}} allowOvernight/><DateTimePicker label="At" defaultValue="2024-01-15T14:30:00Z" referenceDate="2024-01-01" timeZone="America/New_York" adapter={createTemporalAdapter()}/></form>;const host=document.createElement('div');document.body.append(host);host.innerHTML=renderToString(tree);const error=vi.fn();let root!:ReturnType<typeof hydrateRoot>;await act(async()=>{root=hydrateRoot(host,tree,{onRecoverableError:error});});expect(error).not.toHaveBeenCalled();expect(new FormData(host.querySelector('form')!).get('time')).toBe('00:00');expect([...host.querySelectorAll('input[type="text"]')].map(input=>(input as HTMLInputElement).value)).toContain('09:30:00');await act(async()=>root.unmount());host.remove();});
