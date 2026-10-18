import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { Stepper, type Step } from './stepper.js';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const steps:readonly Step[]=[{id:'details',label:'Details',status:'complete'},{id:'review',label:'Review',status:'error'},{id:'submit',label:'Submit',disabled:true}];
describe('consumer-owned step progress',()=>{
  it('reordering retains the consumer selected ID rather than its array index',()=>{
    const view=render(<Stepper value="review" onValueChange={()=>{}} steps={steps}/>);const current=screen.getAllByRole('listitem').find(item=>item.getAttribute('aria-current')==='step');expect(current?.textContent).toContain('Review');view.rerender(<Stepper value="review" onValueChange={()=>{}} steps={[steps[2]!,steps[0]!,steps[1]!]}/>);expect(screen.getAllByRole('listitem').find(item=>item.getAttribute('aria-current')==='step')).toBe(current);
  });
  it('noninteractive progress is an ordered list without extra buttons or callbacks',()=>{
    const change=vi.fn();render(<Stepper value="details" onValueChange={change} steps={steps}/>);expect(screen.getByRole('list').tagName).toBe('OL');expect(screen.getAllByRole('listitem')).toHaveLength(3);expect(screen.queryByRole('button')).toBeNull();expect(change).not.toHaveBeenCalled();
  });
  it('interactive controlled selection proposes only once and waits for committed props while disabled steps never emit',async()=>{
    const user=userEvent.setup(),change=vi.fn(),view=render(<Stepper value="details" onValueChange={change} steps={steps} interactive/>);const review=screen.getByRole('button',{name:/Review/});await user.click(review);expect(change).toHaveBeenCalledExactlyOnceWith('review');expect(review.getAttribute('aria-current')).toBeNull();await user.click(screen.getByRole('button',{name:/Submit/}));expect(change).toHaveBeenCalledOnce();view.rerender(<Stepper value="review" onValueChange={change} steps={steps} interactive/>);expect(review.getAttribute('aria-current')).toBe('step');
  });
  it('error and complete status have localized visible text and do not rely on color',()=>{
    render(<NovaProvider locale="en"><Stepper defaultValue="review" steps={steps}/></NovaProvider>);expect(screen.getByText('Error')).toBeTruthy();expect(screen.getByText('Complete')).toBeTruthy();expect(screen.getAllByRole('listitem').find(item=>item.textContent?.includes('Review'))?.textContent).toContain('Error');
  });
  it('zero steps is an empty named list, and only boundaries between real steps contain connectors',()=>{
    const view=render(<Stepper steps={[]} label="Application progress"/>);expect(screen.getByRole('list',{name:'Application progress'}).children).toHaveLength(0);expect(document.querySelectorAll('.nova-stepper__connector')).toHaveLength(0);view.rerender(<Stepper steps={steps} label="Application progress"/>);expect(document.querySelectorAll('.nova-stepper__connector')).toHaveLength(2);expect(screen.getAllByRole('listitem').at(-1)?.querySelector('.nova-stepper__connector')).toBeNull();
  });
  it('uncontrolled native keyboard selection updates only the local selected step',async()=>{
    const user=userEvent.setup(),change=vi.fn();render(<Stepper defaultValue="details" steps={steps} interactive onValueChange={change}/>);const review=screen.getByRole('button',{name:/Review/});review.focus();await user.keyboard('{Enter}');expect(review.getAttribute('aria-current')).toBe('step');expect(change).toHaveBeenCalledExactlyOnceWith('review');
  });
  it('native Tab reaches enabled steps, skips disabled steps and Space emits one controlled proposal',async()=>{
    const user=userEvent.setup(),change=vi.fn();render(<><Stepper steps={steps} value="details" onValueChange={change} interactive/><button>After progress</button></>);await user.tab();expect(document.activeElement).toBe(screen.getByRole('button',{name:/Details/}));await user.tab();const review=screen.getByRole('button',{name:/Review/});expect(document.activeElement).toBe(review);await user.keyboard(' ');expect(change).toHaveBeenCalledExactlyOnceWith('review');expect(review.getAttribute('aria-current')).toBeNull();await user.tab();expect(document.activeElement).toBe(screen.getByRole('button',{name:'After progress'}));
  });

});
