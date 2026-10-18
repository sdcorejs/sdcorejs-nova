import {createRef} from 'react';
import { Suspense, startTransition, useState, StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { EntityPicker } from './index.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Field as FieldRoot } from '../field/field.js';
type Item = {
    id: number | string;
    label: string;
};
const key = (item: Item) => item.id, label = (item: Item) => item.label;
const zero = { id: 0, label: 'Number zero' }, stringZero = { id: '0', label: 'String zero' };
const basic = { label: 'People', scopeKey: 'one', getKey: key, getLabel: label };
function mount(node: React.ReactNode) { return render(<NovaProvider locale="en">{node}</NovaProvider>); }
async function open() { await userEvent.click(screen.getByRole('combobox', { name: 'People' })); return screen.findByRole('dialog'); }
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e?: unknown) => void; const promise = new Promise<T>((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; }
afterEach(cleanup);
it('case-p2-f13-ac01-unit draft persists raw cross-page keys and commits only on Apply; Cancel preserves', async () => {
    const change = vi.fn(), load = vi.fn(async (r: {
        pageIndex: number;
    }) => ({ items: r.pageIndex === 0 ? [zero] : [stringZero], total: 21 }));
    mount(<EntityPicker {...basic} load={load} multiple onValueChange={change}/>);
    let dialog = await open();
    await screen.findByRole('cell', { name: 'Number zero' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select row 1' }));
    expect(change).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next page' }));
    await screen.findByRole('cell', { name: 'String zero' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select row 1' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(change).toHaveBeenLastCalledWith([0, '0']);
    dialog = await open();
    await screen.findByRole('checkbox', { name: 'Select row 1' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select row 1' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox', { name: 'People' }).textContent).toContain('Number zero');
    expect(screen.getByRole('combobox', { name: 'People' }).textContent).toContain('String zero');
});
it('controlled refusal never commits a draft silently and reopening starts from accepted value', async () => { const change = vi.fn(); mount(<EntityPicker {...basic} value={[]} onValueChange={change} load={async () => ({ items: [zero], total: 1 })}/>); let d = await open(); await screen.findByRole('cell', { name: 'Number zero' }); await userEvent.click(within(d).getByRole('checkbox', { name: 'Select row 1' })); await userEvent.click(within(d).getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenCalledWith([0]); expect(screen.getByRole('combobox', { name: 'People' }).textContent).toContain('No selection'); d = await open(); await screen.findByRole('cell', { name: 'Number zero' }); expect(within(d).getByRole('checkbox', { name: 'Select row 1' }).getAttribute('aria-checked')).toBe('false'); });
it('case-p2-f13-ac02-unit query latest-wins resets page and scope invalidates both independent owners', async () => {
    const reads: {
        query: string;
        pageIndex: number;
        signal: AbortSignal;
        work: ReturnType<typeof deferred<{
            items: readonly Item[];
            total: number;
        }>>;
    }[] = [], hydrations: {
        signal: AbortSignal;
        work: ReturnType<typeof deferred<readonly Item[]>>;
    }[] = [];
    const load = vi.fn((r: {
        query: string;
        pageIndex: number;
        signal: AbortSignal;
    }) => {
        const work = deferred<{
            items: readonly Item[];
            total: number;
        }>();
        reads.push({ ...r, work });
        return work.promise;
    }), hydrate = vi.fn((_keys: readonly (number | string)[], ctx: {
        signal: AbortSignal;
    }) => { const work = deferred<readonly Item[]>(); hydrations.push({ ...ctx, work }); return work.promise; });
    const view = mount(<EntityPicker {...basic} defaultValue={['missing']} multiple load={load} hydrate={hydrate}/>);
    await waitFor(() => expect(hydrations).toHaveLength(1));
    await open();
    await waitFor(() => expect(reads).toHaveLength(1));
    const search = screen.getByRole('searchbox', { name: 'Search' });
    fireEvent.change(search, { target: { value: 'A' } });
    await waitFor(() => expect(reads.at(-1)?.query).toBe('A'));
    const a = reads.at(-1)!;
    fireEvent.change(search, { target: { value: 'B' } });
    await waitFor(() => expect(reads.at(-1)?.query).toBe('B'));
    const b = reads.at(-1)!;
    expect(a.signal.aborted).toBe(true);
    await act(async () => b.work.resolve({ items: [stringZero], total: 50 }));
    await screen.findByRole('cell', { name: 'String zero' });
    await act(async () => a.work.resolve({ items: [zero], total: 1 }));
    expect(screen.queryByRole('cell', { name: 'Number zero' })).toBeNull();
    expect(hydrations[0]!.signal.aborted).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(reads.at(-1)?.pageIndex).toBe(1));
    fireEvent.change(search, { target: { value: 'C' } });
    await waitFor(() => expect(reads.at(-1)?.query).toBe('C'));
    expect(reads.at(-1)?.pageIndex).toBe(0);
    const last = reads.at(-1)!, h = hydrations[0]!;
    view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} scopeKey="two" defaultValue={['missing']} multiple load={load} hydrate={hydrate}/></NovaProvider>);
    await waitFor(() => expect(last.signal.aborted).toBe(true));
    expect(h.signal.aborted).toBe(true);
    await act(async () => { last.work.resolve({ items: [zero], total: 1 }); h.work.resolve([zero]); });
    expect(screen.queryByRole('cell', { name: 'Number zero' })).toBeNull();
});
it('accessor and option wrapper rerenders keep stable transports; changing either transport aborts both', async () => {
    const work = deferred<{
        items: readonly Item[];
        total: number;
    }>(), hw = deferred<readonly Item[]>(), signals: AbortSignal[] = [], hs: AbortSignal[] = [];
    const load = vi.fn((r: {
        signal: AbortSignal;
    }) => { signals.push(r.signal); return work.promise; }), hydrate = vi.fn((_k: readonly (number | string)[], r: {
        signal: AbortSignal;
    }) => { hs.push(r.signal); return hw.promise; });
    const view = mount(<EntityPicker {...basic} defaultValue={['missing']} load={load} hydrate={hydrate}/>);
    await open();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} defaultValue={['missing']} getKey={x => x.id} getLabel={x => x.label} load={load} hydrate={hydrate}/></NovaProvider>);
    expect(load).toHaveBeenCalledTimes(1);
    expect(hydrate).toHaveBeenCalledTimes(1);
    view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} defaultValue={['missing']} load={r => load(r)} hydrate={hydrate}/></NovaProvider>);
    await waitFor(() => expect(signals[0]!.aborted).toBe(true));
    expect(hs[0]!.aborted).toBe(true);
    view.unmount();
    expect(signals.at(-1)!.aborted).toBe(true);
    expect(hs.at(-1)!.aborted).toBe(true);
});
it('case-p2-f13-ac03-unit unresolved key remains with retry; empty results and safe error stay distinct', async () => { const change = vi.fn(), hydrate = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'missing', label: 'Recovered' }]), load = vi.fn().mockResolvedValueOnce({ items: [], total: 0 }).mockRejectedValueOnce(new Error('SECRET')).mockResolvedValue({ items: [], total: 0 }); mount(<EntityPicker {...basic} defaultValue={['missing']} onValueChange={change} load={load} hydrate={hydrate}/>); await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1)); expect(screen.getByRole('combobox', { name: 'People' }).textContent).toContain('missing'); await userEvent.click(screen.getByRole('button', { name: 'Retry selection' })); await waitFor(() => expect(screen.getByRole('combobox', { name: 'People' }).textContent).toContain('Recovered')); await open(); await screen.findByText('No results'); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fail' } }); await screen.findByText('Unable to load results'); expect(screen.queryByText('No results')).toBeNull(); expect(screen.queryByText('SECRET')).toBeNull(); await userEvent.click(screen.getByRole('button', { name: 'Retry results' })); await screen.findByText('No results'); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).not.toHaveBeenCalled(); });
it('single mode maximum one includes select-page proposals', async () => { const change = vi.fn(); mount(<EntityPicker {...basic} load={async () => ({ items: [zero, stringZero], total: 2 })} onValueChange={change}/>); await open(); await screen.findByRole('cell', { name: 'Number zero' }); await userEvent.click(screen.getByRole('checkbox', { name: 'Select current page' })); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).not.toHaveBeenCalled(); await open(); await screen.findByRole('cell', { name: 'Number zero' }); await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' })); expect(screen.getByRole('checkbox', { name: 'Select row 2' }).hasAttribute('disabled') || screen.getByRole('checkbox', { name: 'Select row 2' }).getAttribute('aria-disabled') === 'true').toBe(true); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(change).toHaveBeenLastCalledWith([0]); });
it.each([{ items: [zero, zero], total: 2 }, { items: Array(1), total: 1 }, { items: [zero], total: -1 }, { items: [zero], total: NaN }])('invalid dense page or total rejects safely %#', async (result) => { mount(<EntityPicker {...basic} load={async () => result}/>); await open(); await screen.findByText('Unable to load results'); expect(screen.queryByRole('cell', { name: 'Number zero' })).toBeNull(); });
it.each([[0, 0], Array(1), [NaN], [0, '0']].map(value => ({ value })))('selection input validation and raw zero distinction %#', async ({ value }) => {
    const view = mount(<EntityPicker {...basic} multiple value={value} onValueChange={() => { }} load={async () => ({ items: [], total: 0 })}/>);
    if (value.length === 2 && value[1] === '0')
        expect(screen.getByRole('combobox', { name: 'People' })).toBeTruthy();
    else
        expect(view.container.querySelector('[data-nova-config-error]')).toBeTruthy();
});
it('Field name/error/title/focus, disabled/readOnly and native reset inherit control semantics', async () => { const change = vi.fn(), focus = vi.fn(), blur = vi.fn(); const view = mount(<form aria-label="Form"><FieldRoot label="People" description="Help" error="Problem"><EntityPicker nameFromField scopeKey="one" getKey={key} getLabel={label} defaultValue={[0]} multiple name="people" title="Title" onFocus={focus} onBlur={blur} onValueChange={change} load={async () => ({ items: [zero, stringZero], total: 2 })}/></FieldRoot><button type="reset">Reset</button></form>); const trigger = screen.getByRole('combobox', { name: 'People' }); expect(trigger.getAttribute('aria-invalid')).toBe('true'); expect(trigger.getAttribute('title')).toBe('Title'); expect(trigger.getAttribute('aria-describedby')).toBeTruthy(); expect(new FormData(screen.getByRole('form') as HTMLFormElement).getAll('people')).toEqual(['n:0']); trigger.focus(); expect(focus).toHaveBeenCalled(); await open(); expect(blur).toHaveBeenCalled(); await screen.findByRole('cell', { name: 'String zero' }); await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' })); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); await userEvent.click(screen.getByRole('button', { name: 'Reset' })); await waitFor(() => expect(new FormData(screen.getByRole('form') as HTMLFormElement).getAll('people')).toEqual(['n:0'])); expect(change).toHaveBeenCalledTimes(2); view.unmount(); const load = vi.fn(async () => ({ items: [zero], total: 1 })); mount(<><EntityPicker {...basic} disabled name="disabled" load={load}/><EntityPicker {...basic} label="Readonly" defaultValue={[0]} readOnly load={load}/></>); await userEvent.click(screen.getByRole('combobox', { name: 'People' })); screen.getByRole('combobox', { name: 'Readonly' }).focus(); await userEvent.keyboard('{Enter}'); expect(screen.queryByRole('dialog')).toBeNull(); expect(load).not.toHaveBeenCalled(); });
it('late hydrate after unmount is consumed and aborted without changing focus', async () => { const work = deferred<readonly Item[]>(); let signal!: AbortSignal; const view = mount(<EntityPicker {...basic} defaultValue={['missing']} load={async () => ({ items: [], total: 0 })} hydrate={(_keys, ctx) => { signal = ctx.signal; return work.promise; }}/>); await waitFor(() => expect(signal).toBeTruthy()); view.unmount(); expect(signal.aborted).toBe(true); await act(async () => work.resolve([zero])); });
it('required picker participates in native form validity and respects external form reset', async () => { const load = async () => ({ items: [zero], total: 1 }); mount(<><form id="outside" aria-label="Outside"><button type="reset">Reset outside</button></form><EntityPicker {...basic} required form="outside" name="choice" load={load}/></>); const form = screen.getByRole('form') as HTMLFormElement; expect(form.checkValidity()).toBe(false); await open(); await screen.findByRole('cell', { name: 'Number zero' }); await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' })); await userEvent.click(screen.getByRole('button', { name: 'Apply' })); expect(form.checkValidity()).toBe(true); await userEvent.click(screen.getByRole('button', { name: 'Reset outside' })); await waitFor(() => expect(form.checkValidity()).toBe(false)); expect(new FormData(form).getAll('choice')).toEqual([]); });
it('independent selected hydration latest-wins ignores old key results after accepted value changes', async () => {
    const h1 = deferred<readonly Item[]>(), h2 = deferred<readonly Item[]>(), requests: AbortSignal[] = [], load = async () => ({ items: [], total: 0 }), hydrate = vi.fn((keys: readonly (number | string)[], ctx: {
        signal: AbortSignal;
    }) => { requests.push(ctx.signal); return keys[0] === 0 ? h1.promise : h2.promise; });
    const view = mount(<EntityPicker {...basic} value={[0]} onValueChange={() => { }} load={load} hydrate={hydrate}/>);
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} value={['0']} onValueChange={() => { }} load={load} hydrate={hydrate}/></NovaProvider>);
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2));
    expect(requests[0]!.aborted).toBe(true);
    await act(async () => h2.resolve([stringZero]));
    await waitFor(() => expect(screen.getByRole('combobox').textContent).toContain('String zero'));
    await act(async () => h1.resolve([zero]));
    expect(screen.getByRole('combobox').textContent).not.toContain('Number zero');
});
it('invalid hydration never drops selected keys and exposes safe independent retry', async () => { const hydrate = vi.fn().mockResolvedValueOnce([zero, zero]).mockRejectedValueOnce(new Error('SECRET')).mockResolvedValueOnce([zero]); mount(<EntityPicker {...basic} value={[0]} onValueChange={() => { }} load={async () => ({ items: [], total: 0 })} hydrate={hydrate}/>); await screen.findByText('Unable to resolve selection'); expect(screen.getByRole('combobox').textContent).toContain('Unresolved: 0'); await userEvent.click(screen.getByRole('button', { name: 'Retry selection' })); await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2)); expect(screen.queryByText('SECRET')).toBeNull(); await userEvent.click(screen.getByRole('button', { name: 'Retry selection' })); await waitFor(() => expect(screen.getByRole('combobox').textContent).toContain('Number zero')); });
it('abandoned Suspense scope/accessor render cannot abort or relabel committed reads', async () => {
    const page = deferred<{
        items: readonly Item[];
        total: number;
    }>(), hydrated = deferred<readonly Item[]>(), suspended = new Promise<void>(() => { });
    let loadSignal!: AbortSignal, hydrateSignal!: AbortSignal, change!: () => void;
    const load = vi.fn((r: {
        signal: AbortSignal;
    }) => { loadSignal = r.signal; return page.promise; }), hydrate = vi.fn((_keys: readonly (number | string)[], r: {
        signal: AbortSignal;
    }) => { hydrateSignal = r.signal; return hydrated.promise; });
    function Suspend({ future }: {
        future: boolean;
    }) {
        if (future)
            throw suspended;
        return null;
    }
    function App() { const [future, setFuture] = useState(false); change = () => startTransition(() => setFuture(true)); return <Suspense fallback={<p>Suspended</p>}><EntityPicker {...basic} scopeKey={future ? 'future' : 'one'} value={['missing']} onValueChange={() => { }} getKey={future ? item => 'future:' + item.id : key} getLabel={future ? item => 'Future ' + item.label : label} load={load} hydrate={hydrate}/><Suspend future={future}/></Suspense>; }
    mount(<App />);
    await open();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await act(async () => change());
    expect(loadSignal.aborted).toBe(false);
    expect(hydrateSignal.aborted).toBe(false);
    await act(async () => { page.resolve({ items: [zero], total: 1 }); hydrated.resolve([{ id: 'missing', label: 'Committed selection' }]); });
    await screen.findByRole('cell', { name: 'Number zero' });
    expect(screen.getByRole('group', { name: 'Selected items' }).textContent).toContain('Committed selection');
    expect(screen.queryByText('Future Number zero')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(hydrate).toHaveBeenCalledTimes(1);
});
it('StrictMode cancels abandoned hydration and only the live read can update a summary', async () => {
    const requests: {
        signal: AbortSignal;
        work: ReturnType<typeof deferred<readonly Item[]>>;
    }[] = [], hydrate = vi.fn((_keys: readonly (number | string)[], ctx: {
        signal: AbortSignal;
    }) => { const work = deferred<readonly Item[]>(); requests.push({ signal: ctx.signal, work }); return work.promise; });
    render(<StrictMode><NovaProvider locale="en"><EntityPicker {...basic} value={['missing']} onValueChange={() => { }} load={async () => ({ items: [], total: 0 })} hydrate={hydrate}/></NovaProvider></StrictMode>);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]!.signal.aborted).toBe(true);
    await act(async () => requests[1]!.work.resolve([{ id: 'missing', label: 'Live selection' }]));
    await waitFor(() => expect(screen.getByRole('combobox').textContent).toContain('Live selection'));
    await act(async () => requests[0]!.work.resolve([{ id: 'missing', label: 'Abandoned selection' }]));
    expect(screen.getByRole('combobox').textContent).not.toContain('Abandoned selection');
});
it('hydration retry is available after a cached-key failure and errors belong to the current key set', async () => { const h = deferred<readonly Item[]>(), hydrate = () => h.promise, load = async () => ({ items: [zero], total: 1 }); const view = mount(<EntityPicker {...basic} value={[0]} onValueChange={() => { }} load={load} hydrate={hydrate}/>); await open(); await screen.findByRole('cell', { name: 'Number zero' }); await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); await act(async () => h.reject(new Error('SECRET'))); await screen.findByText('Unable to resolve selection'); expect(screen.getByRole('button', { name: 'Retry selection' })).toBeTruthy(); view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} value={[]} onValueChange={() => { }} load={load} hydrate={hydrate}/></NovaProvider>); expect(screen.queryByText('Unable to resolve selection')).toBeNull(); expect(screen.queryByRole('button', { name: 'Retry selection' })).toBeNull(); });
it('combobox controls the actual modal dialog and never a summary descendant', async () => { mount(<EntityPicker {...basic} load={async () => ({ items: [], total: 0 })}/>); const trigger = screen.getByRole('combobox', { name: 'People' }); expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(trigger.getAttribute('aria-haspopup')).toBe('dialog'); await open(); const popup = document.getElementById(trigger.getAttribute('aria-controls')!); expect(popup?.getAttribute('role')).toBe('dialog'); expect(popup).toBe(screen.getByRole('dialog')); await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(trigger.getAttribute('aria-controls')).toBeNull(); });
it('user selection retry hands focus to the stable trigger before its completion removes Retry', async () => { const h = deferred<readonly Item[]>(), hydrate = vi.fn().mockResolvedValueOnce([]).mockImplementationOnce(() => h.promise); mount(<EntityPicker {...basic} defaultValue={['missing']} load={async () => ({ items: [], total: 0 })} hydrate={hydrate}/>); const retry = await screen.findByRole('button', { name: 'Retry selection' }); await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false)); retry.focus(); await userEvent.keyboard('{Enter}'); expect(document.activeElement).toBe(screen.getByRole('combobox')); await act(async () => h.resolve([{ id: 'missing', label: 'Recovered' }])); expect(document.activeElement).toBe(screen.getByRole('combobox')); });
it('user results retry hands focus to the stable search input before replacing the error action', async () => { const page = deferred<{
    items: readonly Item[];
    total: number;
}>(), load = vi.fn().mockRejectedValueOnce(new Error('private')).mockImplementationOnce(() => page.promise); mount(<EntityPicker {...basic} load={load}/>); await open(); const retry = await screen.findByRole('button', { name: 'Retry results' }); retry.focus(); await userEvent.keyboard('{Enter}'); expect(document.activeElement).toBe(screen.getByRole('searchbox')); await act(async () => page.resolve({ items: [zero], total: 1 })); expect(document.activeElement).toBe(screen.getByRole('searchbox')); });

it('F13-R1 EntityPicker object refs distinguish root measurement from the actual focus trigger',async()=>{const rootRef=createRef<HTMLElement>(),focusRef=createRef<HTMLElement>();const view=mount(<EntityPicker {...basic} load={async()=>({items:[zero],total:1})} ref={rootRef} focusRef={focusRef}/>);const trigger=screen.getByRole('combobox',{name:'People'});expect(rootRef.current).toBe(view.container.querySelector('.nova-entity-picker'));expect(focusRef.current).toBe(trigger);expect(rootRef.current).not.toBe(focusRef.current);expect(rootRef.current?.contains(focusRef.current)).toBe(true);focusRef.current?.focus();expect(document.activeElement).toBe(trigger);await userEvent.keyboard('{Enter}');await screen.findByRole('dialog');await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await waitFor(()=>expect(document.activeElement).toBe(trigger));view.unmount();expect(rootRef.current).toBeNull();expect(focusRef.current).toBeNull();});
it('F13-R1 EntityPicker changed callback refs honor React 19 cleanup and legacy null detach exactly once',async()=>{const rootCleanup=vi.fn(),focusCleanup=vi.fn(),rootRef=vi.fn((node:HTMLElement|null)=>{if(node)return rootCleanup;}),focusRef=vi.fn((node:HTMLElement|null)=>{if(node)return focusCleanup;}),laterRoot=vi.fn((node:HTMLElement|null)=>{void node;}),laterFocus=vi.fn((node:HTMLElement|null)=>{void node;});const load=async()=>({items:[],total:0});const view=mount(<EntityPicker {...basic} load={load} ref={rootRef} focusRef={focusRef}/>);expect(rootRef).toHaveBeenCalledWith(view.container.querySelector('.nova-entity-picker'));expect(focusRef).toHaveBeenCalledWith(screen.getByRole('combobox',{name:'People'}));view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} load={load} ref={rootRef} focusRef={focusRef}/></NovaProvider>);expect(rootRef).toHaveBeenCalledTimes(1);expect(focusRef).toHaveBeenCalledTimes(1);view.rerender(<NovaProvider locale="en"><EntityPicker {...basic} load={load} ref={laterRoot} focusRef={laterFocus}/></NovaProvider>);expect(rootCleanup).toHaveBeenCalledTimes(1);expect(focusCleanup).toHaveBeenCalledTimes(1);expect(rootRef).not.toHaveBeenCalledWith(null);expect(focusRef).not.toHaveBeenCalledWith(null);expect(laterRoot).toHaveBeenCalledWith(view.container.querySelector('.nova-entity-picker'));expect(laterFocus).toHaveBeenCalledWith(screen.getByRole('combobox',{name:'People'}));laterFocus.mock.calls[0]![0]?.focus();await userEvent.keyboard('{Enter}');await screen.findByRole('dialog');await userEvent.click(screen.getByRole('button',{name:'Cancel'}));await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('combobox',{name:'People'})));view.unmount();expect(laterRoot).toHaveBeenCalledTimes(2);expect(laterFocus).toHaveBeenCalledTimes(2);expect(laterRoot).toHaveBeenLastCalledWith(null);expect(laterFocus).toHaveBeenLastCalledWith(null);expect(rootCleanup).toHaveBeenCalledTimes(1);expect(focusCleanup).toHaveBeenCalledTimes(1);});
