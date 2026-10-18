import {useState} from 'react';
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InlineText } from './inline-text.js';
import { Field } from '../field/field.js';

afterEach(() => {cleanup();vi.restoreAllMocks();});

describe('native inline text editing', () => {
  it('uncontrolled default initializes once and emits raw strings without trimming', () => {
    const changed=vi.fn(),view=render(<InlineText label="Name" defaultValue="first" onValueChange={changed}/>);
    const input=view.getByRole('textbox') as HTMLInputElement;
    view.rerender(<InlineText label="Name" defaultValue="later" onValueChange={changed}/>);expect(input.value).toBe('first');
    fireEvent.input(input,{target:{value:' x '}});expect(changed).toHaveBeenLastCalledWith(' x ');expect(input.value).toBe(' x ');
  });
  it('controlled value stays consumer-owned and semantic ref points at the input', () => {
    const changed=vi.fn(),ref=createRef<HTMLInputElement>(),view=render(<InlineText label="Name" value="old" onValueChange={changed} ref={ref}/>);
    const input=view.getByRole('textbox') as HTMLInputElement;expect(ref.current).toBe(input);
    fireEvent.input(input,{target:{value:'new'}});expect(changed).toHaveBeenCalledWith('new');expect(input.value).toBe('old');
    view.rerender(<InlineText label="Name" value="new" onValueChange={changed} ref={ref}/>);expect(input.value).toBe('new');
  });
  it('composition Enter does not commit, ordinary Enter/Escape callbacks preserve native preventDefault', () => {
    const enter=vi.fn(),escape=vi.fn(),native=vi.fn(),view=render(<InlineText label="Name" onEnter={enter} onEscape={escape} onKeyDown={native}/>),input=view.getByRole('textbox');
    fireEvent.compositionStart(input);fireEvent.keyDown(input,{key:'Enter',isComposing:true});expect(enter).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Enter'});expect(enter).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input,{key:'Escape'});expect(escape).toHaveBeenCalledTimes(1);expect(native).toHaveBeenCalledTimes(3);
    view.rerender(<InlineText label="Name" onEnter={enter} onKeyDown={event=>event.preventDefault()}/>);fireEvent.keyDown(input,{key:'Enter'});expect(enter).toHaveBeenCalledTimes(1);
  });
  it('clear emits empty once and returns focus to the actual input', () => {
    const changed=vi.fn(),view=render(<InlineText label="Name" defaultValue="An" clearable onValueChange={changed}/>),input=view.getByRole('textbox') as HTMLInputElement;
    const clear=view.getByRole('button',{name:'Xóa'});fireEvent.click(clear);expect(input.value).toBe('');expect(changed).toHaveBeenCalledTimes(1);expect(changed).toHaveBeenCalledWith('');expect(document.activeElement).toBe(input);expect(view.queryByRole('button')).toBeNull();
  });
  it('size is only visual; invalid minChars clamps to 2 and never creates a length restriction', () => {
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{}),view=render(<InlineText label="Name" minChars={0}/>),input=view.getByRole('textbox') as HTMLInputElement;
    expect(input.size).toBe(2);expect(input.hasAttribute('maxlength')).toBe(false);expect(warning).toHaveBeenCalledWith(expect.stringContaining('NOVA_INLINE_TEXT_INVALID_MIN_CHARS'));
    fireEvent.input(input,{target:{value:'long text'.repeat(100)}});expect(input.value.length).toBe(900);warning.mockRestore();
  });
  it('Field owns label/description/error exactly once, and native form metadata belongs to the input', () => {
    const view=render(<><form id="outer"/><Field label="Tên" description="Mô tả" error="Lỗi"><InlineText nameFromField name="name" form="outer" autoComplete="name" inputMode="text"/></Field></>);
    const input=view.getByRole('textbox',{name:'Tên'}) as HTMLInputElement;expect(input.form?.id).toBe('outer');expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);expect(input.getAttribute('aria-invalid')).toBe('true');expect(input.getAttribute('autocomplete')).toBe('name');
  });
  it('external form reset restores initial default with one callback and cancelled reset does nothing', async () => {
    const changed=vi.fn(),view=render(<><form id="external"/><InlineText label="Name" defaultValue="seed" name="name" form="external" onValueChange={changed}/></>),input=view.getByRole('textbox') as HTMLInputElement,form=input.form!;
    fireEvent.input(input,{target:{value:'edit'}});changed.mockClear();form.reset();await waitFor(()=>expect(input.value).toBe('seed'));expect(changed).toHaveBeenCalledTimes(1);expect(changed).toHaveBeenCalledWith('seed');
    fireEvent.input(input,{target:{value:'keep'}});changed.mockClear();form.addEventListener('reset',event=>event.preventDefault(),{once:true});form.reset();await new Promise(resolve=>setTimeout(resolve,5));expect(input.value).toBe('keep');expect(changed).not.toHaveBeenCalled();
  });
});

it('restores uncontrolled text across a synchronous consumer onReset rerender',async()=>{const change=vi.fn();function App(){const [dirty,setDirty]=useState(false);return <form aria-label="Reset" onReset={()=>setDirty(false)}><output>{String(dirty)}</output><InlineText label="Title" defaultValue="Initial" onValueChange={value=>{change(value);setDirty(true);}}/></form>;}render(<App/>);fireEvent.input(screen.getByRole('textbox'),{target:{value:'Changed'}});change.mockClear();fireEvent.reset(screen.getByRole('form'));await waitFor(()=>expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Initial'));expect(change).toHaveBeenCalledExactlyOnceWith('Initial');});
