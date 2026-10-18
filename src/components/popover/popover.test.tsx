import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { act, createRef, type ComponentPropsWithRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { Button } from '../button/button.js';
import { Dialog } from '../dialog/dialog.js';
import { Popover, Tooltip } from './popover.js';
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
function NativeTrigger(props:ComponentPropsWithRef<'button'>){return <button {...props}/>;}
function NonNativeTrigger(props:ComponentPropsWithRef<'div'>){return <div {...props}/>;}
describe('anchored overlay semantics',()=>{
  it('opens one named nonmodal popup without nesting or losing the trigger handler',async()=>{
    const user=userEvent.setup(),click=vi.fn();render(<Popover label="Details" trigger={<button onClick={click}>More</button>}><input aria-label="Draft"/></Popover>);
    expect(screen.queryByRole('dialog')).toBeNull();await user.click(screen.getByRole('button',{name:'More'}));
    const popup=await screen.findByRole('dialog',{name:'Details'});expect(popup.getAttribute('aria-modal')).not.toBe('true');expect(click).toHaveBeenCalledOnce();expect(document.querySelectorAll('button button').length).toBe(0);
    fireEvent.keyDown(popup,{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(document.activeElement).toBe(screen.getByRole('button',{name:'More'}));
  });
  it('proposes controlled closure and keeps popup until the consumer commits',async()=>{
    const change=vi.fn(),view=render(<Popover label="Details" value={true} onValueChange={change} trigger={<button>More</button>}>Content</Popover>);
    fireEvent.keyDown(await screen.findByRole('dialog',{name:'Details'}),{key:'Escape'});expect(change).toHaveBeenCalledExactlyOnceWith(false);expect(screen.getByRole('dialog')).toBeTruthy();
    view.rerender(<Popover label="Details" value={false} onValueChange={change} trigger={<button>More</button>}>Content</Popover>);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('disabled prevents pointer opening and controlled content exposure',async()=>{
    const user=userEvent.setup();render(<Popover disabled label="Details" value={true} onValueChange={()=>{}} trigger={<button>More</button>}>Content</Popover>);
    await user.click(screen.getByRole('button',{name:'More'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
  it('inherits nearest scope in its portal and focuses explicit content',async()=>{
    const user=userEvent.setup(),initial=createRef<HTMLInputElement>();
    render(<NovaProvider theme="dark" locale="en" dir="rtl" className="brand"><Popover label="Details" initialFocusRef={initial} trigger={<button>More</button>}><input aria-label="Draft" ref={initial}/></Popover></NovaProvider>);
    await user.click(screen.getByRole('button'));const popup=await screen.findByRole('dialog');const scope=popup.closest('.nova-theme')!;expect(scope.getAttribute('data-nova-theme')).toBe('dark');expect(scope.getAttribute('dir')).toBe('rtl');expect(scope.classList.contains('brand')).toBe(true);await waitFor(()=>expect(document.activeElement).toBe(initial.current));
  });
  it('tooltip is a description, persists while focused, and Escape lasts until a new focus transition',async()=>{
    const user=userEvent.setup();render(<Tooltip content="Copy the URL" delayMs={0}><button aria-label="Copy">Copy</button></Tooltip>);
    await user.tab();const trigger=screen.getByRole('button',{name:'Copy'});const tip=await screen.findByRole('tooltip');expect(tip.textContent).toBe('Copy the URL');expect(trigger.getAttribute('aria-label')).toBe('Copy');expect(document.getElementById(trigger.getAttribute('aria-describedby')!)?.textContent).toBe('Copy the URL');
    await new Promise(resolve=>setTimeout(resolve,30));expect(screen.getByRole('tooltip')).toBeTruthy();await user.keyboard('{Escape}');await waitFor(()=>expect(screen.queryByRole('tooltip')).toBeNull());expect(document.activeElement).toBe(trigger);
    fireEvent.blur(trigger);fireEvent.focus(trigger);expect(await screen.findByRole('tooltip')).toBeTruthy();
  });
  it('disabled and empty tooltip content never open, including delayed hover after unmount',async()=>{
    vi.useFakeTimers();const view=render(<Tooltip content="Hint" disabled delayMs={50}><button>Help</button></Tooltip>);fireEvent.focus(screen.getByRole('button'));act(()=>vi.advanceTimersByTime(60));expect(screen.queryByRole('tooltip')).toBeNull();
    view.rerender(<Tooltip content="" delayMs={50}><button>Help</button></Tooltip>);fireEvent.mouseEnter(screen.getByRole('button'));act(()=>vi.advanceTimersByTime(60));expect(screen.queryByRole('tooltip')).toBeNull();
    view.rerender(<Tooltip content="Hint" delayMs={50}><button>Help</button></Tooltip>);fireEvent.mouseEnter(screen.getByRole('button'));view.unmount();act(()=>vi.advanceTimersByTime(60));expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('outside pointer closure keeps focus on the chosen external control',async()=>{
    const user=userEvent.setup();render(<><button>Elsewhere</button><Popover label="Details" trigger={<button>More</button>}><input aria-label="Draft"/></Popover></>);
    await user.click(screen.getByRole('button',{name:'More'}));await screen.findByRole('dialog');await user.click(screen.getByRole('button',{name:'Elsewhere'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(document.activeElement).toBe(screen.getByRole('button',{name:'Elsewhere'}));
  });
  it('tooltip preserves an existing description and never puts its text in the trigger name',async()=>{
    const user=userEvent.setup();render(<><span id="existing">Existing help</span><Tooltip content="Extra help" delayMs={0}><button aria-label="Copy" aria-describedby="existing">Copy</button></Tooltip></>);
    await user.tab();const tip=await screen.findByRole('tooltip'),trigger=screen.getByRole('button',{name:'Copy'});const descriptions=trigger.getAttribute('aria-describedby')!.split(' ');expect(descriptions).toContain('existing');expect(descriptions).toContain(tip.id);await user.keyboard('{Escape}');await waitFor(()=>expect(screen.queryByRole('tooltip')).toBeNull());expect(trigger.getAttribute('aria-describedby')).toBe('existing');
  });
  it('a popover inside a modal remains accessible within its physical primitive portal',async()=>{
    const user=userEvent.setup();render(<Dialog title="Outer" defaultValue={true}><Popover label="Details" trigger={<button>More</button>}><input aria-label="Draft"/></Popover></Dialog>);
    const outer=await screen.findByRole('dialog',{name:'Outer'});await user.click(screen.getByRole('button',{name:'More'}));const popup=await screen.findByRole('dialog',{name:'Details'});expect(outer.closest('[data-base-ui-portal]')!.contains(popup)).toBe(true);await user.keyboard('{Escape}');await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Details'})).toBeNull());expect(screen.getByRole('dialog',{name:'Outer'})).toBeTruthy();
  });

  for(const kind of ['intrinsic-button','intrinsic-div','nova-button','custom-button','custom-div'] as const)for(const key of ['{Enter}',' '] as const){
    it(`${kind} preserves name/ref/consumer click and opens from ${key===' '?'Space':'Enter'}`,async()=>{
      const user=userEvent.setup(),click=vi.fn(),warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
      const buttonRef=createRef<HTMLButtonElement>(),divRef=createRef<HTMLDivElement>();
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Base UI supplies the missing button semantics; this regression verifies that composition.
      const trigger=kind==='intrinsic-button'?<button ref={buttonRef} onClick={click}>More</button>:kind==='intrinsic-div'?<div ref={divRef} tabIndex={0} onClick={click}>More</div>:kind==='nova-button'?<Button ref={buttonRef} onClick={click}>More</Button>:kind==='custom-button'?<NativeTrigger ref={buttonRef} onClick={click}>More</NativeTrigger>:<NonNativeTrigger ref={divRef} role="button" tabIndex={0} onClick={click}>More</NonNativeTrigger>;
      render(<Popover trigger={trigger} label="Details">Content</Popover>);const element=screen.getByRole('button',{name:'More'});expect(buttonRef.current ?? divRef.current).toBe(element);await user.tab();expect(document.activeElement).toBe(element);await user.keyboard(key);expect(await screen.findByRole('dialog',{name:'Details'})).toBeTruthy();expect(click).toHaveBeenCalledOnce();expect(warn.mock.calls.filter(args=>String(args).includes('nativeButton'))).toHaveLength(0);
    });
  }

  it('nested dialog owns a higher isolated scope than its parent popover local positioner',async()=>{
    const property=(file:string,selector:string,name:string)=>{let result='';postcss.parse(readFileSync(file,'utf8')).walkRules(rule=>{if(rule.selector.split(',').map(part=>part.trim()).includes(selector))rule.walkDecls(name,decl=>{result=decl.value;});});return result;};
    render(<Popover trigger={<button>More</button>} label="Parent" defaultValue={true}><Dialog title="Child" defaultValue={true}><input aria-label="Child draft"/></Dialog></Popover>);
    const child=await screen.findByRole('dialog',{name:'Child'}),childScope=child.closest('.nova-theme')!;
    const parentScope=childScope.parentElement!.closest('.nova-theme')!;expect(parentScope.contains(childScope)).toBe(true);expect(childScope.classList.contains('nova-overlay-scope')).toBe(true);expect(parentScope.classList.contains('nova-overlay-scope')).toBe(true);
    const dialogCss='src/styles/components/dialog.css',popoverCss='src/styles/components/popover.css';expect(readFileSync('src/styles/base.css','utf8')).toContain('display: contents;');expect(property(dialogCss,'.nova-overlay-scope','display')).toBe('block');expect(property(dialogCss,'.nova-overlay-scope','isolation')).toBe('isolate');expect(Number(property(dialogCss,'.nova-overlay-scope','z-index'))).toBeGreaterThan(Number(property(popoverCss,'.nova-popover__positioner','z-index')));expect(Number(property(dialogCss,'.nova-dialog__backdrop','z-index'))).toBeLessThan(Number(property(dialogCss,'.nova-dialog','z-index')));
    expect(childScope.hasAttribute('style')).toBe(false);
  });

  it('a disabled non-native trigger keeps its name/ref and cannot open on click or Enter/Space',async()=>{
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The composed primitive owns disabled button semantics.
    const user=userEvent.setup(),ref=createRef<HTMLDivElement>();render(<Popover label="Details" disabled trigger={<div ref={ref} tabIndex={0}>More</div>}>Content</Popover>);const trigger=screen.getByRole('button',{name:'More'});expect(ref.current).toBe(trigger);expect(trigger.getAttribute('aria-disabled')).toBe('true');await user.click(trigger);fireEvent.keyDown(trigger,{key:'Enter'});fireEvent.keyDown(trigger,{key:' '});fireEvent.keyUp(trigger,{key:' '});expect(screen.queryByRole('dialog')).toBeNull();
  });

});
