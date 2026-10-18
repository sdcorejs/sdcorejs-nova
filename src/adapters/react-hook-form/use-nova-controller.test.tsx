import {useForm} from 'react-hook-form';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';
import {afterEach,expect,it} from 'vitest';
import {useNovaController} from './use-nova-controller.js';
import {Input} from '../../components/input/index.js';
import {Checkbox} from '../../components/checkbox/index.js';
afterEach(cleanup);
function Form({disabled=false}:{disabled?:boolean}){const {control,handleSubmit}=useForm<{name:string;agree:boolean|'mixed'}>({defaultValues:{name:'',agree:false}});const name=useNovaController({control,name:'name',rules:{required:'Enter your name'},disabled});const agree=useNovaController({control,name:'agree'});return <form onSubmit={handleSubmit(()=>{})}><Input {...name} label="Name"/><Checkbox {...agree} label="Agree"/><button type="submit">Submit</button></form>;}
it('maps validation error, blur, visible focus ref and value changes to Nova controls',async()=>{const user=userEvent.setup();render(<Form/>);await user.click(screen.getByRole('button',{name:'Submit'}));await waitFor(()=>expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true'));expect(document.activeElement).toBe(screen.getByRole('textbox'));await user.type(screen.getByRole('textbox'),'Annie');await user.click(screen.getByRole('button',{name:'Submit'}));await waitFor(()=>expect(screen.getByRole('textbox').hasAttribute('aria-invalid')).toBe(false));});
it('preserves boolean values and maps disabled to the semantic input',async()=>{const user=userEvent.setup();render(<Form disabled/>);expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);await user.click(screen.getByRole('checkbox'));expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');});
