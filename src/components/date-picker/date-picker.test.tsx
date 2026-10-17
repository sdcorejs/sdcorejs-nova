import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/index.js';
import { Field } from '../field/field.js';
import { Calendar, DatePicker, DateRangePicker } from './date-picker.js';

afterEach(cleanup);
describe('F09 civil dates', () => {
  it('restores valid draft when calendar accepts the already selected date', async () => {
    const user=userEvent.setup();render(<NovaProvider locale="en"><DatePicker label="Date" defaultValue="2026-10-14" referenceDate="2026-10-14"/></NovaProvider>);
    const input=screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input,{target:{value:'garbage'}});fireEvent.blur(input);expect(input.validity.valid).toBe(false);
    await user.click(screen.getByRole('button',{name:'Open calendar'}));
    await user.click(screen.getByRole('button',{name:/Wednesday, October 14, 2026/}));
    expect(input.value).toBe('10/14/2026');expect(input.validity.valid).toBe(true);
  });
  it('keeps whitespace semantically empty for native required validation', () => {
    render(<form aria-label="Dates"><DatePicker label="Date" name="date" required referenceDate="2026-10-14"/></form>);
    const input=screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input,{target:{value:'   '}});expect(input.validity.valueMissing).toBe(true);
    expect((screen.getByRole('form') as HTMLFormElement).checkValidity()).toBe(false);
    expect([...new FormData(screen.getByRole('form') as HTMLFormElement)]).toEqual([]);
  });

  it('propagates the single Field owner error and description to both semantic range inputs', () => {
    render(<Field label="Dates" description="Choose two dates" error="Unavailable"><DateRangePicker nameFromField referenceDate="2026-10-14"/></Field>);
    for(const input of screen.getAllByRole('textbox')) {
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const descriptions=input.getAttribute('aria-describedby')!.split(' ').map(id=>document.getElementById(id)?.textContent).join(' ');
      expect(descriptions).toContain('Choose two dates');expect(descriptions).toContain('Unavailable');
    }
  });
  it('clears a rejected range attempt when the controlled authority supplies a new valid range', async () => {
    const user=userEvent.setup();const {rerender}=render(<DateRangePicker label="Dates" referenceDate="2026-10-14" value={{start:'2026-10-14',end:null}} onValueChange={()=>{}}/>);
    await user.type(screen.getByRole('textbox',{name:'Ngày kết thúc'}),'13/10/2026');expect(screen.getByRole('alert')).toBeTruthy();
    rerender(<DateRangePicker label="Dates" referenceDate="2026-10-14" value={{start:'2026-10-14',end:'2026-10-15'}} onValueChange={()=>{}}/>);
    expect(screen.queryByRole('alert')).toBeNull();expect((screen.getByRole('textbox',{name:'Ngày kết thúc'}) as HTMLInputElement).validity.valid).toBe(true);
  });
  it('commits IME final text once whether the final input comes before or after compositionend', () => {
    const change=vi.fn();render(<DatePicker label="Ngày" referenceDate="2026-10-14" onValueChange={change}/>);
    const input=screen.getByRole('textbox');
    fireEvent.compositionStart(input);fireEvent.input(input,{target:{value:'14/10/2026'},isComposing:true});
    expect(change).not.toHaveBeenCalled();fireEvent.compositionEnd(input);fireEvent.input(input,{target:{value:'14/10/2026'}});
    expect(change).toHaveBeenCalledExactlyOnceWith('2026-10-14');
  });
  it('pages January 31 to leap February 29 and keeps one grid tab stop', async () => {
    const user = userEvent.setup(), change = vi.fn();
    render(<NovaProvider locale="en"><Calendar label="Dates" defaultValue="2024-01-31" referenceDate="2024-01-01" onValueChange={change}/></NovaProvider>);
    const day = screen.getByRole('button', {name: /Wednesday, January 31, 2024/});
    day.focus(); await user.keyboard('{PageDown}');
    expect(document.activeElement).toBe(screen.getByRole('button', {name: /Thursday, February 29, 2024/}));
    expect(screen.getByRole('grid').querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
    await user.keyboard('{Enter}'); expect(change).toHaveBeenCalledWith('2024-02-29');
  });
  it('disabled calendar dates remain readable by keyboard without selecting', async () => {
    const user = userEvent.setup(), change = vi.fn();
    render(<NovaProvider locale="en"><Calendar label="Dates" referenceDate="2026-10-14" min="2026-10-14" max="2026-10-14" onValueChange={change}/></NovaProvider>);
    screen.getByRole('button', {name: /Wednesday, October 14, 2026/}).focus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true');
    expect(change).not.toHaveBeenCalled();
  });
  it('Vietnamese typing validates leap dates, emits civil ISO payload and uncontrolled reset callback', async () => {
    const user = userEvent.setup(), change = vi.fn();
    render(<form aria-label="Dates"><DatePicker label="Ngày" name="date" defaultValue="2024-02-29" referenceDate="2026-10-14" onValueChange={change}/></form>);
    const input = screen.getByRole('textbox', {name: 'Ngày'}) as HTMLInputElement;
    expect(input.value).toBe('29/02/2024');
    await user.clear(input); await user.type(input, '29/02/2026'); fireEvent.blur(input);
    expect(input.validity.valid).toBe(false); expect(change).not.toHaveBeenCalledWith('2026-02-29');
    await user.clear(input); await user.type(input, '14/10/2026');
    expect([...new FormData(screen.getByRole('form') as HTMLFormElement)]).toEqual([['date','2026-10-14']]);
    change.mockClear(); (screen.getByRole('form') as HTMLFormElement).reset();
    await waitFor(() => expect(input.value).toBe('29/02/2024'));
    expect(change).toHaveBeenCalledOnce(); expect(change).toHaveBeenCalledWith('2024-02-29');
  });
  it('range emits explicit partial endpoints and rejects reversed endpoints without swapping', async () => {
    const user = userEvent.setup(), change = vi.fn();
    render(<DateRangePicker label="Khoảng ngày" referenceDate="2026-10-14" defaultValue={{start:null,end:null}} onValueChange={change}/>);
    await user.type(screen.getByRole('textbox', {name:'Ngày bắt đầu'}), '14/10/2026');
    expect(change).toHaveBeenLastCalledWith({start:'2026-10-14',end:null});
    await user.type(screen.getByRole('textbox', {name:'Ngày kết thúc'}), '13/10/2026');
    expect(change).not.toHaveBeenCalledWith({start:'2026-10-14',end:'2026-10-13'});
    expect(screen.getByRole('alert').textContent).toMatch(/Ngày kết thúc/);
  });
  it('clears both custom validity and aria-invalid when a rejected date is corrected', async () => {
    const user=userEvent.setup();render(<DatePicker label="Ngày" referenceDate="2026-10-14"/>);
    const input=screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input,'29/02/2026');fireEvent.blur(input);expect(input.getAttribute('aria-invalid')).toBe('true');
    await user.clear(input);await user.type(input,'29/02/2024');fireEvent.blur(input);
    expect(input.validity.valid).toBe(true);expect(input.hasAttribute('aria-invalid')).toBe(false);
  });
});

it('F11 extraction preserves public single-date Calendar semantics',()=>{
 render(<NovaProvider locale="en"><Calendar label="Single date" referenceDate="2024-01-31" defaultValue="2024-01-31"/></NovaProvider>);
 expect(screen.getByRole('grid').hasAttribute('aria-multiselectable')).toBe(false);
 expect(screen.getByRole('grid').querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
});
