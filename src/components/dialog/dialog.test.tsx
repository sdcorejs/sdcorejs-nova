import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';
import { Dialog, Drawer, Sheet } from './dialog.js';

const hosts:HTMLElement[]=[];
afterEach(()=>{cleanup();for(const host of hosts.splice(0))host.remove();vi.restoreAllMocks();});

describe('dialog requests and portal semantics',()=>{
  it('returns focus to an explicit tabindex -1 container rather than its first child',async()=>{
    const user=userEvent.setup(),back=createRef<HTMLElement>();
    render(<NovaProvider locale="en"><main ref={back} tabIndex={-1}><button>Child action</button></main><Dialog title="Rename" defaultValue returnFocusRef={back}><input aria-label="Name"/></Dialog></NovaProvider>);
    await user.click(await screen.findByRole('button',{name:'Close'}));await waitFor(()=>expect(document.activeElement).toBe(back.current));
  });
  it('keeps a programmatic outside focus attempt inside the active modal',async()=>{
    render(<NovaProvider locale="en"><input aria-label="Outside"/><Dialog title="Rename" defaultValue><input aria-label="Inside"/></Dialog></NovaProvider>);
    const popup=await screen.findByRole('dialog');await waitFor(()=>expect(popup.contains(document.activeElement)).toBe(true));
    (document.querySelector('input[aria-label="Outside"]') as HTMLInputElement).focus();
    await waitFor(()=>expect(popup.contains(document.activeElement)).toBe(true));
  });

  it('closed controlled value renders no popup content or portal child',()=>{
    const host=document.createElement('section');hosts.push(host);document.body.append(host);
    render(<NovaProvider portalContainer={host}><Dialog title="Rename" value={false} onValueChange={()=>{}}><input aria-label="Name"/></Dialog></NovaProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('textbox')).toBeNull();expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it('title and short description name the popup, and private portal scope leaves its host unchanged',async()=>{
    const host=document.createElement('section');hosts.push(host);host.className='consumer-host';host.setAttribute('dir','ltr');document.body.append(host);
    const view=render(<NovaProvider portalContainer={host} theme="dark" dir="rtl" locale="en" className="consumer-brand"><Dialog title="Rename" description="A short explanation" defaultValue={true}>Form</Dialog></NovaProvider>);
    const popup=await screen.findByRole('dialog',{name:'Rename'});expect(host.contains(popup)).toBe(true);const wrapper=host.firstElementChild!;
    expect(wrapper.className).toBe('nova-theme nova-overlay-scope consumer-brand');expect(wrapper.getAttribute('data-nova-theme')).toBe('dark');expect(wrapper.getAttribute('dir')).toBe('rtl');expect(wrapper.getAttribute('lang')).toBe('en');
    expect(popup.getAttribute('aria-modal')).toBe('true');expect(document.getElementById(popup.getAttribute('aria-describedby')!)?.textContent).toBe('A short explanation');
    expect(host.className).toBe('consumer-host');expect(host.getAttribute('dir')).toBe('ltr');view.unmount();expect(host.childElementCount).toBe(0);
  });
  it('the localized close action proposes once and an uncontrolled dialog closes',async()=>{
    const user=userEvent.setup(),change=vi.fn(),request=vi.fn();render(<NovaProvider locale="vi"><Dialog title="Đổi tên" defaultValue={true} onValueChange={change} onCloseRequest={request}>Form</Dialog></NovaProvider>);
    await user.click(await screen.findByRole('button',{name:'Đóng'}));expect(request).toHaveBeenCalledExactlyOnceWith('action');expect(change).toHaveBeenCalledExactlyOnceWith(false);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('a controlled proposal keeps content and locks until committed false',async()=>{
    const change=vi.fn(),request=vi.fn(),view=render(<NovaProvider locale="en"><Dialog title="Rename" value={true} onValueChange={change} onCloseRequest={request}>Form</Dialog></NovaProvider>);
    fireEvent.click(await screen.findByRole('button',{name:'Close'}));expect(request).toHaveBeenCalledExactlyOnceWith('action');expect(change).toHaveBeenCalledExactlyOnceWith(false);expect(screen.getByRole('dialog',{name:'Rename'})).toBeTruthy();
    view.rerender(<NovaProvider locale="en"><Dialog title="Rename" value={false} onValueChange={change} onCloseRequest={request}>Form</Dialog></NovaProvider>);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('Escape is a synchronous vetoable request rather than a forced state change',async()=>{
    const change=vi.fn(),request=vi.fn(()=>false);render(<Dialog title="Rename" defaultValue={true} onValueChange={change} onCloseRequest={request}>Form</Dialog>);
    const popup=await screen.findByRole('dialog',{name:'Rename'});fireEvent.keyDown(popup,{key:'Escape'});expect(request).toHaveBeenCalledExactlyOnceWith('escape');expect(change).not.toHaveBeenCalled();expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('closeDisabled suppresses action and Escape requests while consumer props may still close',async()=>{
    const change=vi.fn(),request=vi.fn(),view=render(<Dialog title="Rename" value={true} onValueChange={change} onCloseRequest={request} closeDisabled>Form</Dialog>);
    const popup=await screen.findByRole('dialog');const close=screen.getByRole('button',{name:'Đóng'});expect(close.getAttribute('disabled')).not.toBeNull();fireEvent.click(close);fireEvent.keyDown(popup,{key:'Escape'});expect(change).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
    view.rerender(<Dialog title="Rename" value={false} onValueChange={change} closeDisabled>Form</Dialog>);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('explicit initial and return focus refs address actual consumer elements',async()=>{
    const user=userEvent.setup(),initial=createRef<HTMLInputElement>(),back=createRef<HTMLButtonElement>();
    render(<NovaProvider locale="en"><button type="button" ref={back}>Launch</button><Dialog title="Rename" defaultValue={true} initialFocusRef={initial} returnFocusRef={back}><input ref={initial} aria-label="Name"/></Dialog></NovaProvider>);
    await screen.findByRole('dialog');await waitFor(()=>expect(document.activeElement).toBe(initial.current));await user.click(screen.getByRole('button',{name:'Close'}));await waitFor(()=>expect(document.activeElement).toBe(back.current));
  });
  it('a nonmodal dialog does not steal focus and restores it only on an action close',async()=>{
    const user=userEvent.setup(),launch=document.createElement('button');launch.textContent='Launch';document.body.append(launch);hosts.push(launch);launch.focus();
    render(<NovaProvider locale="en"><Dialog title="Tools" defaultValue={true} modal={false}>Tools</Dialog></NovaProvider>);const popup=await screen.findByRole('dialog');expect(popup.getAttribute('aria-modal')).not.toBe('true');expect(document.activeElement).toBe(launch);
    await user.click(screen.getByRole('button',{name:'Close'}));await waitFor(()=>expect(document.activeElement).toBe(launch));
  });
  it('two nested dialogs settle only the top Escape and unmount removes wrappers and scroll styles',async()=>{
    const outer=vi.fn(),inner=vi.fn(),beforeBody=document.body.style.cssText,beforeRoot=document.documentElement.style.cssText;
    const view=render(<Dialog title="Outer" defaultValue={true} onValueChange={outer}><Dialog title="Inner" defaultValue={true} onValueChange={inner}>Inside</Dialog></Dialog>);
    fireEvent.keyDown(await screen.findByRole('dialog',{name:'Inner'}),{key:'Escape'});expect(inner).toHaveBeenCalledExactlyOnceWith(false);expect(outer).not.toHaveBeenCalled();
    view.unmount();await waitFor(()=>{expect(document.body.querySelector('[role="dialog"]')).toBeNull();expect(document.body.style.cssText).toBe(beforeBody);expect(document.documentElement.style.cssText).toBe(beforeRoot);});
  });
  it('Sheet and Drawer share named semantics while carrying logical layout variants',async()=>{
    const view=render(<NovaProvider locale="en"><Sheet title="Options" defaultValue={true} side="start" size="sm">Options</Sheet></NovaProvider>);
    const sheet=await screen.findByRole('dialog',{name:'Options'});expect(sheet.classList.contains('nova-sheet')).toBe(true);expect(sheet.getAttribute('data-side')).toBe('start');expect(sheet.getAttribute('data-size')).toBe('sm');view.unmount();
    render(<Drawer title="Options" defaultValue={true} side="bottom">Options</Drawer>);expect((await screen.findByRole('dialog',{name:'Options'})).getAttribute('data-side')).toBe('bottom');
  });
  it('a nested external host falls back to the parent modal subtree with an explicit diagnostic',async()=>{
    const host=document.createElement('section');hosts.push(host);document.body.append(host);
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const view=render(<Dialog title="Outer" defaultValue={true}><NovaProvider portalContainer={host} locale="en"><Dialog title="Inner" defaultValue={true}>Inside</Dialog></NovaProvider></Dialog>);
    const inner=await screen.findByRole('dialog',{name:'Inner'});expect(host.contains(inner)).toBe(false);expect(inner.parentElement!.closest('[data-base-ui-portal]')?.parentElement?.closest('[data-base-ui-portal]')).toBeTruthy();expect(warn.mock.calls.filter(args=>String(args).includes('NOVA_NESTED_PORTAL_CONTAINER'))).toHaveLength(1);
    view.unmount();expect(host.childElementCount).toBe(0);
  });
  it('moving the owning portal container removes the old scoped wrapper without changing either host',async()=>{
    const first=document.createElement('section'),second=document.createElement('section');hosts.push(first,second);document.body.append(first,second);
    const view=render(<NovaProvider portalContainer={first}><Dialog title="Move" value={true} onValueChange={()=>{}}>Form</Dialog></NovaProvider>);
    expect(first.contains(await screen.findByRole('dialog',{name:'Move'}))).toBe(true);
    view.rerender(<NovaProvider portalContainer={second}><Dialog title="Move" value={true} onValueChange={()=>{}}>Form</Dialog></NovaProvider>);
    await waitFor(()=>expect(second.contains(screen.getByRole('dialog',{name:'Move'}))).toBe(true));expect(first.childElementCount).toBe(0);expect(first.getAttribute('class')).toBeNull();expect(second.getAttribute('class')).toBeNull();
    view.unmount();expect(second.childElementCount).toBe(0);expect(first.attributes.length).toBe(0);expect(second.attributes.length).toBe(0);
  });
  it('a removed return target falls back to a reachable consumer button',async()=>{
    const user=userEvent.setup(),back=createRef<HTMLButtonElement>();
    const view=render(<NovaProvider locale="en"><button ref={back}>Removed</button><button>Fallback</button><Dialog title="Rename" value={true} onValueChange={()=>{}} returnFocusRef={back}>Form</Dialog></NovaProvider>);
    await screen.findByRole('dialog');
    view.rerender(<NovaProvider locale="en"><button>Fallback</button><Dialog title="Rename" value={true} onValueChange={()=>{}} returnFocusRef={back}>Form</Dialog></NovaProvider>);
    await user.click(screen.getByRole('button',{name:'Close'}));
    view.rerender(<NovaProvider locale="en"><button>Fallback</button><Dialog title="Rename" value={false} onValueChange={()=>{}} returnFocusRef={back}>Form</Dialog></NovaProvider>);
    await waitFor(()=>expect(document.activeElement?.textContent).toBe('Fallback'));
  });

  it('a nested nonmodal parent permits an independent explicit host without a modal fallback warning',async()=>{
    const host=document.createElement('section');hosts.push(host);document.body.append(host);const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    render(<Dialog title="Outer" defaultValue={true} modal={false}><NovaProvider portalContainer={host}><Dialog title="Inner" defaultValue={true} modal={false}>Inside</Dialog></NovaProvider></Dialog>);
    expect(host.contains(await screen.findByRole('dialog',{name:'Inner'}))).toBe(true);expect(warn.mock.calls.filter(args=>String(args).includes('NOVA_NESTED_PORTAL_CONTAINER'))).toHaveLength(0);
  });
  it('a target inside the active parent popup is honored and nested close restores the actual opener',async()=>{
    const user=userEvent.setup(),host=createRef<HTMLDivElement>(),launch=createRef<HTMLButtonElement>();
    function Example(){const [open,setOpen]=useState(false);return <Dialog title="Outer" defaultValue={true}><button ref={launch} onClick={()=>setOpen(true)}>Open child</button><div ref={host}/><NovaProvider portalContainer={host.current} locale="en"><Dialog title="Inner" value={open} onValueChange={setOpen}><input aria-label="Nested draft"/></Dialog></NovaProvider></Dialog>;}
    render(<Example/>);await user.click(await screen.findByRole('button',{name:'Open child'}));const inner=await screen.findByRole('dialog',{name:'Inner'});expect(host.current!.contains(inner)).toBe(true);await waitFor(()=>expect(inner.contains(document.activeElement)).toBe(true));await user.keyboard('{Escape}');await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Inner'})).toBeNull());await waitFor(()=>expect(document.activeElement).toBe(launch.current));
  });

  it('a root overlay in an iframe restores the opener from the actual popup document',async()=>{
    const iframe=document.createElement('iframe');hosts.push(iframe);document.body.append(iframe);const owner=iframe.contentDocument!,host=owner.createElement('section'),launch=owner.createElement('button');launch.textContent='Frame launch';owner.body.append(launch,host);launch.focus();
    const user=userEvent.setup({document:owner});render(<NovaProvider portalContainer={host} locale="en"><Dialog title="Frame tools" defaultValue={true}><input aria-label="Frame draft"/></Dialog></NovaProvider>);
    const popup=await within(owner.body).findByRole('dialog',{name:'Frame tools'});expect(popup.ownerDocument).toBe(owner);await waitFor(()=>expect(popup.contains(owner.activeElement)).toBe(true));await user.click(within(popup).getByRole('button',{name:'Close'}));await waitFor(()=>expect(owner.activeElement).toBe(launch));
  });

});

describe('round-2 owner decision Q4: size and footer',()=>{
  it('maps named sizes to data-size, custom px to an inline width, and keeps the 512 default without a size',async()=>{
    const {rerender}=render(<NovaProvider locale="en"><Dialog title="Contract" defaultValue>Body</Dialog></NovaProvider>);
    let popup=await screen.findByRole('dialog');expect(popup.hasAttribute('data-size')).toBe(false);expect(popup.style.inlineSize).toBe('');
    for(const size of ['sm','md','lg'] as const){rerender(<NovaProvider locale="en"><Dialog title="Contract" defaultValue size={size}>Body</Dialog></NovaProvider>);popup=screen.getByRole('dialog');expect(popup.getAttribute('data-size')).toBe(size);expect(popup.style.inlineSize).toBe('');}
    for(const [size,width] of [[480,'480px'],['480px','480px'],['512.5px','512.5px']] as const){rerender(<NovaProvider locale="en"><Dialog title="Contract" defaultValue size={size} style={{color:'red'}}>Body</Dialog></NovaProvider>);popup=screen.getByRole('dialog');expect(popup.hasAttribute('data-size')).toBe(false);expect(popup.style.inlineSize).toBe(width);expect(popup.style.color).toBe('red');}
    rerender(<NovaProvider locale="en"><Dialog title="Contract" defaultValue size={480} style={{inlineSize:'300px'}}>Body</Dialog></NovaProvider>);expect(screen.getByRole('dialog').style.inlineSize).toBe('300px');
  });
  it('rejects other strings and non-positive numbers with one diagnostic and the default width',async()=>{
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    for(const size of ['wide','480','480 px','-5px','0px',0,-1,Number.NaN,Number.POSITIVE_INFINITY]){
      const view=render(<NovaProvider locale="en"><Dialog title="Contract" defaultValue size={size as never}>Body</Dialog></NovaProvider>);
      const popup=await screen.findByRole('dialog');expect(popup.hasAttribute('data-size')).toBe(false);expect(popup.style.inlineSize).toBe('');view.unmount();
    }
    expect(warn.mock.calls.filter(call=>String(call[0]).includes('NOVA_DIALOG_INVALID_SIZE'))).toHaveLength(9);
  });
  it('renders the footer after the scrolling body inside the dialog, for Dialog and Sheet',async()=>{
    const {rerender}=render(<NovaProvider locale="en"><Dialog title="Contract" defaultValue footer={<button>Save contract</button>}>Body</Dialog></NovaProvider>);
    let popup=await screen.findByRole('dialog'),footer=popup.querySelector('.nova-dialog__footer')!;
    expect(within(footer as HTMLElement).getByRole('button',{name:'Save contract'})).toBeTruthy();expect(footer.previousElementSibling?.className).toBe('nova-dialog__body');expect(popup.lastElementChild).toBe(footer);
    rerender(<NovaProvider locale="en"><Sheet title="Filters" defaultValue size="lg" footer={<button>Apply filters</button>}>Body</Sheet></NovaProvider>);
    popup=await screen.findByRole('dialog',{name:'Filters'});footer=popup.querySelector('.nova-dialog__footer')!;
    expect(popup.getAttribute('data-size')).toBe('lg');expect(within(footer as HTMLElement).getByRole('button',{name:'Apply filters'})).toBeTruthy();
    rerender(<NovaProvider locale="en"><Dialog title="Contract" defaultValue>Body</Dialog></NovaProvider>);
    expect((await screen.findByRole('dialog',{name:'Contract'})).querySelector('.nova-dialog__footer')).toBeNull();
  });
  it('moves initial focus into the body before the footer actions',async()=>{
    render(<NovaProvider locale="en"><Dialog title="Contract" defaultValue footer={<button>Save contract</button>}><input aria-label="Contract number"/></Dialog></NovaProvider>);
    await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('textbox',{name:'Contract number'})));
  });
});
