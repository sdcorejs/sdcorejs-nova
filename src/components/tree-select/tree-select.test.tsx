import {createRef} from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TreeSelect } from './index.js';
import { NovaProvider } from '../../providers/nova/index.js';
type Node = {
    id: number | string;
    label: string;
    children?: readonly Node[];
};
const child = { id: '0', label: 'Child' }, root = { id: 0, label: 'Root', children: [child] }, key = (x: Node) => x.id, label = (x: Node) => x.label;
const tree = { mode: 'static' as const, roots: [root], getChildren: (x: Node) => x.children ?? [] };
const base = { label: 'Places', scopeKey: 'a', tree, getKey: key, getLabel: label };
function mount(node: React.ReactNode) { return render(<NovaProvider locale="en">{node}</NovaProvider>); }
afterEach(cleanup);
it('TreeSelect default selection never cascades; Apply commits and Cancel preserves', async () => { const change = vi.fn(); mount(<TreeSelect {...base} onValueChange={change}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await screen.findByRole('treeitem', { name: 'Root' }); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); expect(change).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenLastCalledWith([0]); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(change).toHaveBeenCalledTimes(1); });
it('explicit loaded cascade selects collapsed supplied descendants with typed zero keys', async () => { const change = vi.fn(); mount(<TreeSelect {...base} cascade="loaded" onValueChange={change}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await screen.findByRole('treeitem'); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenCalledWith([0, '0']); });
it('lazy loaded-only cascade never fetches collapsed children or selects future arrivals', async () => { let resolve!: (items: readonly Node[]) => void; const loadChildren = vi.fn(() => new Promise<readonly Node[]>(r => { resolve = r; })), change = vi.fn(), lazy = { mode: 'lazy' as const, roots: [root], hasChildren: (x: Node) => x.id === 0, loadChildren }; mount(<TreeSelect {...base} tree={lazy} cascade="loaded" onValueChange={change}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); expect(loadChildren).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Expand Root' })); await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(1)); await act(async () => resolve([child])); await screen.findByRole('treeitem', { name: 'Child' }); expect(screen.getByRole('treeitem', { name: 'Child' }).getAttribute('aria-selected')).toBe('false'); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenCalledWith([0]); });
it('cascade uses already loaded lazy descendants only and does not create a second hierarchy transport', async () => { const loadChildren = vi.fn(async () => [child]), change = vi.fn(); mount(<TreeSelect {...base} tree={{ mode: 'lazy', roots: [root], hasChildren: x => x.id === 0, loadChildren }} cascade="loaded" onValueChange={change}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await userEvent.click(screen.getByRole('button', { name: 'Expand Root' })); await screen.findByRole('treeitem', { name: 'Child' }); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenCalledWith([0, '0']); expect(loadChildren).toHaveBeenCalledTimes(1); });
it('scope closes draft and aborts Tree pending load; fresh source wrapper does not restart', async () => {
    let signal!: AbortSignal;
    const loadChildren = vi.fn((_item: Node, ctx: {
        signal: AbortSignal;
    }) => { signal = ctx.signal; return new Promise<readonly Node[]>(() => { }); });
    const lazy = { mode: 'lazy' as const, roots: [root], hasChildren: (x: Node) => x.id === 0, loadChildren };
    const view = mount(<TreeSelect {...base} tree={lazy}/>);
    await userEvent.click(screen.getByRole('combobox', { name: 'Places' }));
    await userEvent.click(screen.getByRole('button', { name: 'Expand Root' }));
    await waitFor(() => expect(signal).toBeTruthy());
    view.rerender(<NovaProvider locale="en"><TreeSelect {...base} tree={{ ...lazy }} getKey={x => x.id} getLabel={x => x.label}/></NovaProvider>);
    expect(loadChildren).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(false);
    view.rerender(<NovaProvider locale="en"><TreeSelect {...base} scopeKey="b" tree={lazy}/></NovaProvider>);
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(screen.queryByRole('dialog')).toBeNull();
});
it('invalid hierarchy disables unsafe Apply; sparse selection rejects without coercion', async () => { const change = vi.fn(); mount(<TreeSelect {...base} tree={{ ...tree, roots: [root, root] }} onValueChange={change}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await screen.findByRole('alert'); expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true); expect(change).not.toHaveBeenCalled(); cleanup(); const view = mount(<TreeSelect {...base} defaultValue={Array(1)}/>); expect(view.container.querySelector('[data-nova-config-error]')).toBeTruthy(); });
it('sparse hierarchy roots or child arrays reject before accessors can invent phantom keys', async () => {
    const getKey = (x: Node) => x?.id ?? 99, getLabel = (x: Node) => x?.label ?? 'Phantom';
    for (const source of [{ mode: 'static' as const, roots: Array<Node>(1), getChildren: () => [] }, { mode: 'static' as const, roots: [root], getChildren: (x: Node) => x?.id === 0 ? Array<Node>(1) : [] }]) {
        mount(<TreeSelect {...base} tree={source} getKey={getKey} getLabel={getLabel}/>);
        await userEvent.click(screen.getByRole('combobox', { name: 'Places' }));
        expect((screen.getByRole('button', { name: 'Apply' }) as HTMLButtonElement).disabled).toBe(true);
        cleanup();
    }
});
it('selecting a loaded branch retains the expanded tree and its current keyboard position', async () => { mount(<TreeSelect {...base}/>); await userEvent.click(screen.getByRole('combobox', { name: 'Places' })); await userEvent.click(screen.getByRole('button', { name: 'Expand Root' })); await screen.findByRole('treeitem', { name: 'Child' }); await userEvent.click(screen.getByText('Root', { selector: '.nova-tree__content' })); expect(screen.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-expanded')).toBe('true'); expect(screen.getByRole('treeitem', { name: 'Child' })).toBeTruthy(); });

it('F13-R1 TreeSelect object refs distinguish root measurement from the actual focus trigger',async()=>{const rootRef=createRef<HTMLElement>(),focusRef=createRef<HTMLElement>();const view=mount(<TreeSelect {...base}  ref={rootRef} focusRef={focusRef}/>);const trigger=screen.getByRole('combobox',{name:'Places'});expect(rootRef.current).toBe(view.container.querySelector('.nova-entity-picker'));expect(focusRef.current).toBe(trigger);expect(rootRef.current).not.toBe(focusRef.current);expect(rootRef.current?.contains(focusRef.current)).toBe(true);focusRef.current?.focus();expect(document.activeElement).toBe(trigger);await userEvent.keyboard('{Enter}');await screen.findByRole('dialog');await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await waitFor(()=>expect(document.activeElement).toBe(trigger));view.unmount();expect(rootRef.current).toBeNull();expect(focusRef.current).toBeNull();});
it('F13-R1 TreeSelect changed callback refs honor React 19 cleanup and legacy null detach exactly once',async()=>{const rootCleanup=vi.fn(),focusCleanup=vi.fn(),rootRef=vi.fn((node:HTMLElement|null)=>{if(node)return rootCleanup;}),focusRef=vi.fn((node:HTMLElement|null)=>{if(node)return focusCleanup;}),laterRoot=vi.fn((node:HTMLElement|null)=>{void node;}),laterFocus=vi.fn((node:HTMLElement|null)=>{void node;});const load=async()=>({items:[],total:0});const view=mount(<TreeSelect {...base}  ref={rootRef} focusRef={focusRef}/>);expect(rootRef).toHaveBeenCalledWith(view.container.querySelector('.nova-entity-picker'));expect(focusRef).toHaveBeenCalledWith(screen.getByRole('combobox',{name:'Places'}));view.rerender(<NovaProvider locale="en"><TreeSelect {...base}  ref={rootRef} focusRef={focusRef}/></NovaProvider>);expect(rootRef).toHaveBeenCalledTimes(1);expect(focusRef).toHaveBeenCalledTimes(1);view.rerender(<NovaProvider locale="en"><TreeSelect {...base}  ref={laterRoot} focusRef={laterFocus}/></NovaProvider>);expect(rootCleanup).toHaveBeenCalledTimes(1);expect(focusCleanup).toHaveBeenCalledTimes(1);expect(rootRef).not.toHaveBeenCalledWith(null);expect(focusRef).not.toHaveBeenCalledWith(null);expect(laterRoot).toHaveBeenCalledWith(view.container.querySelector('.nova-entity-picker'));expect(laterFocus).toHaveBeenCalledWith(screen.getByRole('combobox',{name:'Places'}));laterFocus.mock.calls[0]![0]?.focus();await userEvent.keyboard('{Enter}');await screen.findByRole('dialog');await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('combobox',{name:'Places'})));view.unmount();expect(laterRoot).toHaveBeenCalledTimes(2);expect(laterFocus).toHaveBeenCalledTimes(2);expect(laterRoot).toHaveBeenLastCalledWith(null);expect(laterFocus).toHaveBeenLastCalledWith(null);expect(rootCleanup).toHaveBeenCalledTimes(1);expect(focusCleanup).toHaveBeenCalledTimes(1);void load;});
