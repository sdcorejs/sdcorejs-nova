import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovaProvider } from '../../providers/nova/nova-provider.js';

import { AppShell, Navigation, Sidebar, type NavItem } from './app-shell.js';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function media(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return matches; },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (value: boolean) => act(() => { matches = value; listeners.forEach(listener => listener()); });
}

describe('C14 AppShell', () => {
  it('C14-AC01: skip link focuses main without changing a consumer hash route', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '#/forms');
    render(<AppShell mainId="page-content" skipLabel="Tới nội dung"><h1>Biểu mẫu</h1></AppShell>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', {name: 'Tới nội dung'}));
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(screen.getByRole('main').id).toBe('page-content');
    expect(window.location.hash).toBe('#/forms');
  });

  it('C14-AC03: current page is consumer-owned and one-level links keep native semantics', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Navigation label="Điều hướng chính" currentId="files" onNavigate={navigate} items={[
      {id: 'workspace', label: 'Không gian làm việc', children: [
        {id: 'files', label: 'Tệp của tôi', href: '#/files'},
        {id: 'reports', label: 'Báo cáo', href: '#/reports'},
      ]},
      {id: 'disabled', label: 'Chưa khả dụng', href: '#/disabled', disabled: true},
      {id: 'unsafe', label: 'Unsafe', href: 'javascript:alert(1)'},
    ]}/>);
    expect(screen.getByRole('navigation', {name: 'Điều hướng chính'})).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Tệp của tôi'}).getAttribute('aria-current')).toBe('page');
    await user.click(screen.getByRole('link', {name: 'Báo cáo'}));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({id: 'reports'}));
    expect(screen.getByRole('link', {name: 'Tệp của tôi'}).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('link', {name: 'Chưa khả dụng'})).toBeNull();
    expect(screen.queryByRole('link', {name: 'Unsafe'})).toBeNull();
    await user.click(screen.getByText('Chưa khả dụng'));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('C14-AC03: rejects nested navigation groups at runtime', () => {
    const items = [{id: 'a', label: 'A', children: [{id: 'b', label: 'B', children: []}]}] as unknown as NavItem[];
    expect(() => render(<Navigation label="Main" items={items}/>)).toThrow(/one level/i);
  });

  it('router renderer receives safe native props and owns preventDefault', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<Navigation label="Main" items={[{id: 'one', label: 'One', href: '#/one'}]} onNavigate={navigate}
      renderLink={({item, linkProps}) => <a {...linkProps} href={linkProps.href} onClick={event => {
        event.preventDefault();
        linkProps.onClick(event);
      }}>{item.label}</a>}/>);
    await user.click(screen.getByRole('link', {name: 'One'}));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('C14-AC02: desktop collapse preserves mounted consumer state', async () => {
    media(true);
    const user = userEvent.setup();
    function Content() {
      const [value, setValue] = useState('');
      return <input aria-label="Draft" value={value} onChange={event => setValue(event.target.value)}/>;
    }
    render(<Sidebar label="Workspace" defaultValue triggerLabel="Toggle"><Content/></Sidebar>);
    await user.type(screen.getByRole('textbox', {name: 'Draft'}), 'Tiếng Việt');
    await user.click(screen.getByRole('button', {name: 'Toggle'}));
    expect(screen.getByRole('button', {name: 'Toggle'}).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', {name: 'Toggle'}));
    expect((screen.getByRole('textbox', {name: 'Draft'}) as HTMLInputElement).value).toBe('Tiếng Việt');
  });

  it('C14-AC02: mobile drawer returns focus on Escape and closes on desktop crossing', async () => {
    const resize = media(false);
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Sidebar label="Workspace" triggerLabel="Open menu" onMobileValueChange={change}><a href="#/files">Files</a></Sidebar>);
    const trigger = screen.getByRole('button', {name: 'Open menu'});
    await user.click(trigger);
    expect(await screen.findByRole('dialog', {name: 'Workspace'})).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    expect(await screen.findByRole('dialog', {name: 'Workspace'})).toBeTruthy();
    resize(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(change.mock.calls.map(args => args[0])).toEqual([true, false, true, false]);
    resize(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('C14-AC02: desktop crossing before focus enters the drawer still returns focus to the explicit target', async () => {
    const resize = media(false);
    const main = document.createElement('main');main.tabIndex = -1;document.body.append(main);
    try {
      render(<Sidebar label="Workspace" triggerLabel="Open menu" returnFocusRef={{current: main}}><a href="#/files">Files</a></Sidebar>);
      const trigger = screen.getByRole('button', {name: 'Open menu'});
      // Open and cross to desktop in one turn, before the drawer moves focus inside (Linux CI timing).
      act(() => { trigger.focus(); trigger.click(); });
      expect(document.activeElement).toBe(trigger);
      resize(true);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(main));
    } finally { main.remove(); }
  });

  it('C14-AC02: desktop crossing parks focused drawer content and still returns focus to the explicit target', async () => {
    const resize = media(false);
    const user = userEvent.setup();
    const main = document.createElement('main');main.tabIndex = -1;document.body.append(main);
    try {
      render(<Sidebar label="Workspace" triggerLabel="Open menu" returnFocusRef={{current: main}}><a href="#/files">Files</a></Sidebar>);
      await user.click(screen.getByRole('button', {name: 'Open menu'}));
      const dialog = await screen.findByRole('dialog', {name: 'Workspace'});
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      // Parking the content host moves the focused link out of the drawer; React then restores focus to it.
      resize(true);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(document.activeElement).toBe(main));
    } finally { main.remove(); }
  });

  it('C14-AC02: the consumer subtree mounts once and retains draft across mobile reopen and breakpoints', async () => {
    const resize = media(true);
    const user = userEvent.setup();
    const mounted = vi.fn(), unmounted = vi.fn();
    function Content() {
      const [draft, setDraft] = useState('');
      useEffect(() => { mounted(); return unmounted; }, []);
      return <input id="single-draft" aria-label="Persistent draft" value={draft} onChange={event => setDraft(event.target.value)}/>;
    }
    const view = render(<Sidebar label="Workspace" triggerLabel="Menu"><Content/></Sidebar>);
    await user.type(screen.getByRole('textbox'), 'Bản nháp');
    resize(false);
    await user.click(screen.getByRole('button', {name: 'Menu'}));
    const dialog = await screen.findByRole('dialog');
    expect(document.querySelectorAll('#single-draft')).toHaveLength(1);
    expect((dialog.querySelector('input') as HTMLInputElement).value).toBe('Bản nháp');
    await user.type(dialog.querySelector('input')!, ' mobile');
    expect((dialog.querySelector('input') as HTMLInputElement).value).toBe('Bản nháp mobile');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', {name: 'Menu'}));
    expect(((await screen.findByRole('dialog')).querySelector('input') as HTMLInputElement).value).toBe('Bản nháp mobile');
    resize(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Bản nháp mobile');
    expect(mounted).toHaveBeenCalledOnce();
    expect(unmounted).not.toHaveBeenCalled();
    view.unmount();
    expect(unmounted).toHaveBeenCalledOnce();
  });

  it('controlled mobile close can be rejected but breakpoint cleanup still suppresses the stale open value', async () => {
    const resize = media(false);
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Sidebar label="Workspace" triggerLabel="Menu" mobileValue onMobileValueChange={change}><a href="#/files">Files</a></Sidebar>);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(change).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeTruthy();
    resize(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    resize(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Menu'}));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('mobile Drawer uses the provider portal container', async () => {
    media(false);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = render(<NovaProvider portalContainer={host}><Sidebar label="Workspace" defaultMobileValue><button>Action</button></Sidebar></NovaProvider>);
    try { expect(host.contains(await screen.findByRole('dialog'))).toBe(true); }
    finally { view.unmount(); host.remove(); }
  });
});
