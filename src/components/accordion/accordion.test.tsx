import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem, CollapsibleSection } from './accordion.js';

afterEach(cleanup);

describe('collapsible heading and panel ownership', () => {
  it('click and native Enter each toggle once, while a sibling action is independent', async () => {
    const user=userEvent.setup(),change=vi.fn(),action=vi.fn();
    render(<CollapsibleSection title="Details" onValueChange={change} actions={<button type="button" onClick={action}>Help</button>}><p>Content</p></CollapsibleSection>);
    const trigger=screen.getByRole('button',{name:'Details'}),help=screen.getByRole('button',{name:'Help'});
    expect(help.closest('h3')).toBeNull();expect(trigger.getAttribute('aria-expanded')).toBe('false');expect(screen.queryByText('Content')).toBeNull();
    await user.click(help);expect(action).toHaveBeenCalledTimes(1);expect(change).not.toHaveBeenCalled();
    await user.click(trigger);expect(change).toHaveBeenLastCalledWith(true);expect(change).toHaveBeenCalledTimes(1);expect(screen.getByText('Content')).toBeTruthy();
    await user.keyboard('{Enter}');expect(change).toHaveBeenLastCalledWith(false);expect(change).toHaveBeenCalledTimes(2);expect(screen.queryByText('Content')).toBeNull();
  });
  it('controlled close stays a proposal until the consumer commits it', () => {
    const change=vi.fn(),view=render(<CollapsibleSection title="Details" value={true} onValueChange={change}><p>Content</p></CollapsibleSection>);
    fireEvent.click(screen.getByRole('button',{name:'Details'}));expect(change).toHaveBeenCalledExactlyOnceWith(false);expect(screen.getByText('Content')).toBeTruthy();
    view.rerender(<CollapsibleSection title="Details" value={false} onValueChange={change}><p>Content</p></CollapsibleSection>);expect(screen.queryByText('Content')).toBeNull();
  });
  it('returns active focus to the heading before a kept panel becomes hidden and inert', () => {
    const change=vi.fn(),focusState:boolean[]=[];
    const content=<input aria-label="Draft"/>;
    const view=render(<CollapsibleSection title="Details" value={true} onValueChange={change} keepMounted>{content}</CollapsibleSection>);
    const input=screen.getByRole('textbox',{name:'Draft'}),trigger=screen.getByRole('button',{name:'Details'}),panel=input.closest('[role="region"]') as HTMLElement;
    trigger.addEventListener('focus',()=>focusState.push(Boolean(panel.hidden) || panel.hasAttribute('inert')));
    input.focus();view.rerender(<CollapsibleSection title="Details" value={false} onValueChange={change} keepMounted>{content}</CollapsibleSection>);
    expect(document.activeElement).toBe(trigger);expect(focusState).toEqual([false]);expect(panel.hidden).toBe(true);expect(panel.hasAttribute('inert')).toBe(true);expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('returns focus before an unmounted panel disappears and ignores disabled toggles', () => {
    const change=vi.fn(),view=render(<CollapsibleSection title="Details" value={true} onValueChange={change}><input aria-label="Draft"/></CollapsibleSection>);
    const input=screen.getByRole('textbox',{name:'Draft'}),trigger=screen.getByRole('button',{name:'Details'}),connected:boolean[]=[];
    trigger.addEventListener('focus',()=>connected.push(input.isConnected));input.focus();
    view.rerender(<CollapsibleSection title="Details" value={false} onValueChange={change} disabled><input aria-label="Draft"/></CollapsibleSection>);
    expect(document.activeElement).toBe(trigger);expect(connected).toEqual([true]);fireEvent.click(trigger);expect(change).not.toHaveBeenCalled();expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('accordion collection semantics', () => {
  const items=(reverse=false)=>(reverse?['b','a']:['a','b']).map(value=><AccordionItem key={value} value={value} title={'Item '+value}><p>{'Panel '+value}</p></AccordionItem>);
  it('single mode keeps only one item open and stable identities survive reorder', async () => {
    const user=userEvent.setup(),change=vi.fn(),view=render(<Accordion onValueChange={change}>{items()}</Accordion>);
    await user.click(screen.getByRole('button',{name:'Item a'}));expect(change).toHaveBeenLastCalledWith(['a']);const id=screen.getByRole('button',{name:'Item a'}).id;
    await user.click(screen.getByRole('button',{name:'Item b'}));expect(change).toHaveBeenLastCalledWith(['b']);expect(screen.queryByText('Panel a')).toBeNull();expect(screen.getByText('Panel b')).toBeTruthy();
    view.rerender(<Accordion onValueChange={change}>{items(true)}</Accordion>);expect(screen.getByRole('button',{name:'Item a'}).id).toBe(id);expect(screen.getByText('Panel b')).toBeTruthy();
  });
  it('multiple mode retains ordered keys and callbacks do not occur during render', () => {
    const change=vi.fn();render(<Accordion multiple defaultValue={['a']} onValueChange={change}>{items()}</Accordion>);expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Item b'}));expect(change).toHaveBeenCalledExactlyOnceWith(['a','b']);expect(screen.getAllByRole('region')).toHaveLength(2);
  });
  it('nested heading and panel IDs are unique with semantic heading levels', () => {
    render(<Accordion defaultValue={['outer']}><AccordionItem value="outer" title="Outer" headingLevel={2}><CollapsibleSection title="Inner" defaultValue={true} headingLevel={4}><p>Nested</p></CollapsibleSection></AccordionItem></Accordion>);
    expect(screen.getByRole('heading',{name:'Outer',level:2})).toBeTruthy();expect(screen.getByRole('heading',{name:'Inner',level:4})).toBeTruthy();
    const buttons=screen.getAllByRole('button');expect(new Set(buttons.map(x=>x.id)).size).toBe(2);const panels=screen.getAllByRole('region');expect(new Set(panels.map(x=>x.id)).size).toBe(2);
    for(const button of buttons){const panel=document.getElementById(button.getAttribute('aria-controls')!);expect(panel).toBeTruthy();expect(panel?.getAttribute('aria-labelledby')).toBe(button.id);}
  });
});
