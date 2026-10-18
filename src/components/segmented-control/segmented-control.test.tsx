import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { Field } from '../field/field.js';
import { SegmentedControl, type SegmentValue, type SegmentOption } from './segmented-control.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const items:readonly SegmentOption<SegmentValue>[]=[{value:0,label:'Zero'},{value:false,label:'False'},{value:'0',label:'Text zero'},{value:'off',label:'Disabled',disabled:true}];
describe('typed controlled segment choices',()=>{
  it('distinguishes zero, false and string keys and waits for authoritative selection',async()=>{
    const user=userEvent.setup(),change=vi.fn(),view=render(<SegmentedControl label="Mode" items={items} value={0} onValueChange={change}/>);expect(screen.getByRole('radio',{name:'Zero'}).getAttribute('aria-checked')).toBe('true');await user.click(screen.getByRole('radio',{name:'False'}));expect(change).toHaveBeenCalledExactlyOnceWith(false);expect(screen.getByRole('radio',{name:'Zero'}).getAttribute('aria-checked')).toBe('true');view.rerender(<SegmentedControl label="Mode" items={items} value={false} onValueChange={change}/>);expect(screen.getByRole('radio',{name:'False'}).getAttribute('aria-checked')).toBe('true');
  });
  it('never clears repeated single selection but supplies an explicit localized clear action',async()=>{
    const user=userEvent.setup(),change=vi.fn();render(<NovaProvider locale="en"><SegmentedControl label="Mode" items={items} value={false} onValueChange={change} allowEmpty/></NovaProvider>);await user.click(screen.getByRole('radio',{name:'False'}));expect(change).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Clear selection'}));expect(change).toHaveBeenCalledExactlyOnceWith(null);
  });
  it('single arrow navigation selects immediately and skips disabled options',async()=>{
    const user=userEvent.setup(),change=vi.fn();render(<SegmentedControl label="Mode" items={items} value={0} onValueChange={change}/>);screen.getByRole('radio',{name:'Zero'}).focus();await user.keyboard('{ArrowRight}');expect(document.activeElement).toBe(screen.getByRole('radio',{name:'False'}));expect(change).toHaveBeenLastCalledWith(false);
  });
  it('horizontal RTL arrows reverse and vertical arrows retain their direction',async()=>{
    const user=userEvent.setup(),change=vi.fn(),view=render(<NovaProvider dir="rtl"><SegmentedControl label="Mode" items={items} value={false} onValueChange={change}/></NovaProvider>);screen.getByRole('radio',{name:'False'}).focus();await user.keyboard('{ArrowRight}');expect(change).toHaveBeenLastCalledWith(0);change.mockClear();view.rerender(<NovaProvider dir="rtl"><SegmentedControl label="Mode" items={items} value={false} onValueChange={change} orientation="vertical"/></NovaProvider>);screen.getByRole('radio',{name:'False'}).focus();await user.keyboard('{ArrowDown}');expect(change).toHaveBeenLastCalledWith('0');
  });
  it('multi arrows only focus, Space toggles a fresh array in item order',async()=>{
    const user=userEvent.setup(),change=vi.fn(),selected:readonly SegmentValue[]=['0'];render(<SegmentedControl label="Modes" items={items} multiple value={selected} onValueChange={change}/>);screen.getByRole('button',{name:'Zero'}).focus();await user.keyboard('{ArrowRight}');expect(document.activeElement).toBe(screen.getByRole('button',{name:'False'}));expect(change).not.toHaveBeenCalled();await user.keyboard(' ');expect(change).toHaveBeenCalledExactlyOnceWith([false,'0']);expect(change.mock.calls[0]![0]).not.toBe(selected);expect(screen.queryByRole('tab')).toBeNull();
  });
  it('duplicate type+value keys diagnose rather than rendering ambiguous controls',()=>{
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});render(<SegmentedControl label="Mode" items={[{value:false,label:'A'},{value:false,label:'B'}]} value={false} onValueChange={()=>{}}/>);expect(screen.getByText(/Lỗi cấu hình/)).toBeTruthy();expect(warning.mock.calls.some(call=>String(call[0]).includes('NOVA_RADIO_DUPLICATE_KEY'))).toBe(true);expect(screen.queryByRole('radio')).toBeNull();
  });
  it('Field has one group owner, preserves error associations and ref points to actual selected button',()=>{
    const ref=createRef<HTMLButtonElement>();render(<Field label="Mode" description="Choose mode" error="Please review"><SegmentedControl nameFromField items={items} value={false} onValueChange={()=>{}} ref={ref}/></Field>);const group=screen.getByRole('radiogroup',{name:'Mode'});expect(group.getAttribute('aria-describedby')?.split(' ').map(id=>document.getElementById(id)?.textContent)).toEqual(['Choose mode','Please review']);expect(ref.current).toBe(screen.getByRole('radio',{name:'False'}));expect(ref.current?.tagName).toBe('BUTTON');
  });
  it('external forms receive exactly typed scalar and ordered multi payloads without draft duplicates',()=>{
    const view=render(<><form id="outside"/><SegmentedControl label="Mode" form="outside" name="mode" items={items} value={false} onValueChange={()=>{}}/><SegmentedControl label="Modes" form="outside" name="modes" items={items} multiple value={[0,'0',false]} onValueChange={()=>{}}/></>);const form=document.getElementById('outside') as HTMLFormElement;expect(new FormData(form).getAll('mode')).toEqual(['b:false']);expect(new FormData(form).getAll('modes')).toEqual(['n:0','b:false','s:0']);view.rerender(<><form id="outside"/><SegmentedControl label="Mode" form="outside" name="mode" items={items} value={false} onValueChange={()=>{}} disabled/></>);expect(new FormData(document.getElementById('outside') as HTMLFormElement).has('mode')).toBe(false);
  });
  it('readonly choices retain focus and payload but cannot mutate or clear',async()=>{
    const user=userEvent.setup(),change=vi.fn();render(<NovaProvider locale="en"><SegmentedControl label="Mode" items={items} value={false} onValueChange={change} readOnly allowEmpty name="mode"/></NovaProvider>);const option=screen.getByRole('radio',{name:'Zero'});option.focus();expect(document.activeElement).toBe(option);await user.click(option);await user.click(screen.getByRole('button',{name:'Clear selection'}));expect(change).not.toHaveBeenCalled();
  });
  it('native form reset leaves controlled props authoritative and emits no fake proposal',()=>{
    const change=vi.fn();render(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value={false} onValueChange={change} name="mode"/></form>);(screen.getByRole('form') as HTMLFormElement).reset();expect(screen.getByRole('radio',{name:'False'}).getAttribute('aria-checked')).toBe('true');expect(change).not.toHaveBeenCalled();
  });
  it('selected disabled items do not submit, and their semantic ref falls back to the first enabled control',()=>{
    const ref=createRef<HTMLButtonElement>();render(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value="off" onValueChange={()=>{}} name="mode" ref={ref}/></form>);expect(new FormData(screen.getByRole('form') as HTMLFormElement).has('mode')).toBe(false);expect(ref.current).toBe(screen.getByRole('radio',{name:'Zero'}));
  });
  it('unknown controlled values diagnose without mutating the consumer or manufacturing a selection',()=>{
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{}),change=vi.fn();render(<SegmentedControl label="Mode" items={items} value="missing" onValueChange={change}/>);expect(screen.getAllByRole('radio').every(item=>item.getAttribute('aria-checked')==='false')).toBe(true);expect(change).not.toHaveBeenCalled();expect(warning.mock.calls.some(call=>String(call[0]).includes('NOVA_RADIO_UNKNOWN_VALUE'))).toBe(true);
  });

  it('a required multi Field has native invalidity until an enabled selection is committed, with visible control focus',()=>{
    const change=vi.fn(),view=render(<form aria-label="Edit"><Field label="Modes" required><SegmentedControl nameFromField items={items} multiple value={[]} onValueChange={change} name="mode"/></Field></form>);const form=screen.getByRole('form') as HTMLFormElement;expect(form.checkValidity()).toBe(false);expect(document.activeElement).toBe(screen.getByRole('button',{name:'Zero'}));const group=screen.getByRole('group',{name:'Modes'});expect(group.getAttribute('aria-describedby')?.split(' ').map(id=>document.getElementById(id)?.textContent).join(' ')).toContain('Bắt buộc');expect(change).not.toHaveBeenCalled();view.rerender(<form aria-label="Edit"><Field label="Modes" required><SegmentedControl nameFromField items={items} multiple value={[false]} onValueChange={change} name="mode"/></Field></form>);expect(form.checkValidity()).toBe(true);expect(new FormData(form).getAll('mode')).toEqual(['b:false']);
  });
  it('required multi external forms do not validate disabled collection and cannot satisfy required with a disabled item',()=>{
    const view=render(<><form id="outside"/><SegmentedControl label="Modes" items={items} multiple value={['off']} onValueChange={()=>{}} required name="mode" form="outside"/></>);expect((document.getElementById('outside') as HTMLFormElement).checkValidity()).toBe(false);view.rerender(<><form id="outside"/><SegmentedControl label="Modes" items={items} multiple value={[]} onValueChange={()=>{}} required disabled name="mode" form="outside"/></>);expect((document.getElementById('outside') as HTMLFormElement).checkValidity()).toBe(true);expect(new FormData(document.getElementById('outside') as HTMLFormElement).getAll('mode')).toEqual([]);
  });

  it('named required single groups validate their selected native radio and omit duplicate payloads',()=>{
    const view=render(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} name="mode" required/></form>);const form=screen.getByRole('form') as HTMLFormElement;expect(form.checkValidity()).toBe(true);expect(new FormData(form).getAll('mode')).toEqual(['b:false']);view.rerender(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value={null} onValueChange={()=>{}} name="mode" required/></form>);expect(form.checkValidity()).toBe(false);
  });
  it('external required single native radio group participates in the referenced form',()=>{
    const view=render(<><form id="outside"/><SegmentedControl label="Mode" items={items} value={null} onValueChange={()=>{}} name="mode" required form="outside"/></>);const form=document.getElementById('outside') as HTMLFormElement;expect(form.checkValidity()).toBe(false);view.rerender(<><form id="outside"/><SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} name="mode" required form="outside"/></>);expect(form.checkValidity()).toBe(true);expect(new FormData(form).getAll('mode')).toEqual(['b:false']);
  });
  it('unnamed required single progress validates once without leaking an internal name into native payload',()=>{
    const view=render(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value={false} onValueChange={()=>{}} required/></form>);const form=screen.getByRole('form') as HTMLFormElement;expect(form.checkValidity()).toBe(true);expect([...new FormData(form)]).toEqual([]);view.rerender(<form aria-label="Edit"><SegmentedControl label="Mode" items={items} value={null} onValueChange={()=>{}} required/></form>);expect(form.checkValidity()).toBe(false);
  });

});
