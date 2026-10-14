import { StrictMode, useLayoutEffect, useState } from 'react';
import { cleanup, act, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusyBoundary } from '../../components/busy-boundary/busy-boundary.js';

import { ActionInProgressError, useAsyncAction } from './async-action.js';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

afterEach(cleanup);

describe('useAsyncAction lifecycle', () => {
  it('starts only on an event and settles success with its original value', async () => {
    const work = deferred<number>(), action = vi.fn(() => work.promise);
    const hook = renderHook(() => useAsyncAction(action));
    expect(action).not.toHaveBeenCalled(); expect(hook.result.current.pending).toBe(false);
    let run!: Promise<number>;
    act(() => { run = hook.result.current.run(); });
    expect(hook.result.current.pending).toBe(true);
    await act(async () => { work.resolve(0); await expect(run).resolves.toBe(0); });
    expect(action).toHaveBeenCalledTimes(1); expect(hook.result.current.pending).toBe(false);
  });

  it.each([['same', 'same'], ['first', 'different']])('rejects duplicate calls with %s/%s arguments', async (a, b) => {
    const work = deferred<string>(), action = vi.fn<(ctx: {signal: AbortSignal}, input: string) => Promise<string>>(() => work.promise);
    const hook = renderHook(() => useAsyncAction(action));
    let first!: Promise<string>; act(() => { first = hook.result.current.run(a); });
    const failure = vi.fn();
    await act(async () => { void hook.result.current.run(b).catch(failure); await flush(); });
    expect(failure).toHaveBeenCalledTimes(1);
    expect(failure.mock.calls[0]?.[0]).toBeInstanceOf(ActionInProgressError);
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => { work.resolve('accepted'); await first; });
  });

  it('cancel aborts immediately even if the consumer ignores the signal and allows retry', async () => {
    const old = deferred<number>(), next = deferred<number>();
    const action = vi.fn((_ctx: {signal: AbortSignal}, attempt: number) => attempt === 1 ? old.promise : next.promise);
    const hook = renderHook(() => useAsyncAction(action));
    let first!: Promise<number>; act(() => { first = hook.result.current.run(1); });
    const failure = vi.fn(); void first.catch(failure);
    await act(async () => { await flush(); hook.result.current.cancel(); await flush(); });
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
    expect(action.mock.calls[0]?.[0].signal.aborted).toBe(true); expect(hook.result.current.pending).toBe(false);
    let second!: Promise<number>; act(() => { second = hook.result.current.run(2); });
    await act(async () => { old.reject(new Error('late')); await flush(); });
    expect(hook.result.current.pending).toBe(true); expect(hook.result.current.error).toBeNull();
    await act(async () => { next.resolve(2); await expect(second).resolves.toBe(2); });
    expect(hook.result.current.pending).toBe(false);
  });

  it('unmount settles the caller and never accepts late completion', async () => {
    const work = deferred<number>(), hook = renderHook(() => useAsyncAction(() => work.promise));
    let run!: Promise<number>; act(() => { run = hook.result.current.run(); });
    const failure = vi.fn(); void run.catch(failure);
    hook.unmount(); await flush();
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
    work.resolve(8); await flush();
  });

  it('failures reset pending, expose the original error and the next run clears it', async () => {
    const error = new Error('failure'), action = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(false);
    const hook = renderHook(() => useAsyncAction(action));
    await act(async () => { await expect(hook.result.current.run()).rejects.toBe(error); });
    expect(hook.result.current.pending).toBe(false); expect(hook.result.current.error).toBe(error);
    await act(async () => { await expect(hook.result.current.run()).resolves.toBe(false); });
    expect(hook.result.current.error).toBeNull();
  });

  it('two hook instances have independent pending and cancellation', async () => {
    const a = deferred<number>(), b = deferred<number>();
    const hook = renderHook(() => ({ a: useAsyncAction(() => a.promise), b: useAsyncAction(() => b.promise) }));
    let first!: Promise<number>, second!: Promise<number>;
    act(() => { first = hook.result.current.a.run(); second = hook.result.current.b.run(); });
    const failure = vi.fn(); void first.catch(failure);
    await act(async () => { hook.result.current.a.cancel(); await flush(); });
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
    expect(hook.result.current.b.pending).toBe(true);
    await act(async () => { b.resolve(4); await expect(second).resolves.toBe(4); });
    a.resolve(2); await flush();
  });
});

describe('cancellation before the returned hook promise settles', () => {
  it.each(['cancel', 'unmount'] as const)('%s supersedes success in the helper-to-hook microtask window', async mode => {
    const hook = renderHook(() => useAsyncAction(() => Promise.resolve(8)));
    await act(async () => {
      const run = hook.result.current.run();
      queueMicrotask(() => { if (mode === 'cancel') hook.result.current.cancel(); else hook.unmount(); });
      await expect(run).rejects.toMatchObject({name:'AbortError'});
    });
  });

  it.each(['cancel', 'unmount'] as const)('%s supersedes work rejection in the helper-to-hook microtask window', async mode => {
    const hook = renderHook(() => useAsyncAction(() => Promise.reject(new Error('original failure'))));
    await act(async () => {
      const run = hook.result.current.run();
      queueMicrotask(() => { if (mode === 'cancel') hook.result.current.cancel(); else hook.unmount(); });
      await expect(run).rejects.toMatchObject({name:'AbortError'});
    });
  });

  it('synchronous abort listeners may start a new invocation without old state overwriting it', async () => {
    const firstWork=deferred<number>(), replacementWork=deferred<number>();
    let replacement!:Promise<number>;
    const action=vi.fn((ctx:{signal:AbortSignal}, attempt:number) => {
      if(attempt===1) {
        ctx.signal.addEventListener('abort', () => { replacement=hook.result.current.run(2); }, {once:true});
        return firstWork.promise;
      }
      return replacementWork.promise;
    });
    const hook=renderHook(() => useAsyncAction(action));
    let first!:Promise<number>;act(() => {first=hook.result.current.run(1);});
    const failure=first.catch(error => error);
    await act(async () => {hook.result.current.cancel();await flush();});
    expect(hook.result.current.pending).toBe(true);
    expect(action).toHaveBeenCalledTimes(2);
    await expect(failure).resolves.toMatchObject({name:'AbortError'});
    await act(async () => {replacementWork.resolve(2);await expect(replacement).resolves.toBe(2);});
    firstWork.resolve(1);await flush();
    expect(hook.result.current.pending).toBe(false);expect(hook.result.current.error).toBeNull();
  });
});

describe('BusyBoundary composes consumer controls', () => {
  it('indicator keeps content and announces a visible named status without disabling actions', () => {
    const action=vi.fn(),view=render(<BusyBoundary busy label="Saving"><button onClick={action}>Action</button><input aria-label="Draft" defaultValue="keep"/></BusyBoundary>);
    expect(view.getByRole('status').textContent).toBe('Saving');expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull();
    fireEvent.click(view.getByRole('button'));expect(action).toHaveBeenCalledOnce();expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('keep');
    view.rerender(<BusyBoundary busy={false} label="Saving"><button onClick={action}>Action</button><input aria-label="Draft" defaultValue="keep"/></BusyBoundary>);
    expect(view.queryByRole('status')).toBeNull();expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('keep');
  });
  it('block mode keeps consumer-owned disabling and no inert focus trap', () => {
    const view=render(<BusyBoundary busy mode="block" label="Waiting"><button disabled>Submit</button></BusyBoundary>);
    expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(true);expect(view.container.querySelector('[inert]')).toBeNull();expect(view.getByRole('status').textContent).toBe('Waiting');
  });
});

describe('async action committed owner lifetime',()=>{
 it('removed owner cannot start consumer work from a retained callback in later sibling layout',async()=>{const action=vi.fn(async()=>42);let run:()=>Promise<number>=async()=>0;let outcome:Promise<unknown>|undefined;function Owner(){const state=useAsyncAction(action);useLayoutEffect(()=>{run=state.run;},[state.run]);return null;}function Later({removed}:{removed:boolean}){useLayoutEffect(()=>{if(removed)outcome=run().then(value=>value,error=>error);},[removed]);return null;}function App(){const [show,setShow]=useState(true);return <>{show&&<Owner/>}<Later removed={!show}/><button onClick={()=>setShow(false)}>Remove owner</button></>;}const view=render(<App/>);fireEvent.click(view.getByRole('button',{name:'Remove owner'}));expect(action).not.toHaveBeenCalled();expect(await outcome).toMatchObject({name:'AbortError'});});
 it('StrictMode layout cleanup and setup preserve the live owner',async()=>{const action=vi.fn(async()=>42);const hook=renderHook(()=>useAsyncAction(action),{wrapper:({children})=><StrictMode>{children}</StrictMode>});await act(async()=>{expect(await hook.result.current.run()).toBe(42);});expect(action).toHaveBeenCalledTimes(1);hook.unmount();await expect(hook.result.current.run()).rejects.toMatchObject({name:'AbortError'});expect(action).toHaveBeenCalledTimes(1);});
});
