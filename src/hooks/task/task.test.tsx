import {useLayoutEffect} from 'react';
import {act,cleanup,render,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useTask,type TaskState,type TaskSource} from './task.js';
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function flush(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
it('case-p2-s06-ac01-unit delayed poll never overlaps, schedules after settlement and terminal stops',async()=>{
 vi.useFakeTimers();const first=deferred<TaskState<object>>(),raw={zero:0},load=vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({id:'job',status:'succeeded',result:raw});
 const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load,intervalMs:10}}));expect(load).toHaveBeenCalledTimes(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});expect(load).toHaveBeenCalledTimes(1);
 await act(async()=>{first.resolve({id:'job',status:'running',progress:10});await flush();});
 await act(async()=>{await vi.advanceTimersByTimeAsync(999);});expect(load).toHaveBeenCalledTimes(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});expect(load).toHaveBeenCalledTimes(2);expect(h.result.current.state.result).toBe(raw);expect(h.result.current.state.status).toBe('succeeded');
 await act(async()=>{await vi.advanceTimersByTimeAsync(60000);h.result.current.retry();await flush();});expect(load).toHaveBeenCalledTimes(2);
});
it('case-p2-s06-ac02-unit changing scope or load aborts old response and ignores late completion',async()=>{
 const old=deferred<TaskState<number>>(),next=deferred<TaskState<number>>(),load=vi.fn((ctx:{id:string;signal:AbortSignal})=>{void ctx;return old.promise;}),replacement=vi.fn(()=>next.promise);
 const h=renderHook(({scope,read})=>useTask({id:'job',scopeKey:scope,source:{mode:'poll',load:read}}),{initialProps:{scope:'a',read:load}});
 h.rerender({scope:'b',read:replacement});expect(load.mock.calls[0]?.[0].signal.aborted).toBe(true);
 await act(async()=>{next.resolve({id:'job',status:'succeeded',result:0});await flush();old.resolve({id:'job',status:'succeeded',result:9});await flush();});expect(h.result.current.state.result).toBe(0);
});
it('fresh source wrappers with stable load do not restart the transport',async()=>{
 const work=deferred<TaskState<number>>(),load=vi.fn((ctx:{id:string;signal:AbortSignal})=>{void ctx;return work.promise;});const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load}}));h.rerender();h.rerender();expect(load).toHaveBeenCalledTimes(1);expect(load.mock.calls[0]?.[0].signal.aborted).toBe(false);h.unmount();expect(load.mock.calls[0]?.[0].signal.aborted).toBe(true);
});
it.each(['false','reject'] as const)('case-p2-s06-ac03-unit remote cancel %s never fabricates cancelled and is not retried',async mode=>{
 const cancel=vi.fn(()=>mode==='false'?Promise.resolve(false):Promise.reject(new Error('secret'))),load=vi.fn(()=>new Promise<TaskState<number>>(()=>{}));const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load},initialState:{id:'job',status:'running'},cancel}));
 await act(async()=>{if(mode==='false')expect(await h.result.current.cancel()).toBe(false);else await expect(h.result.current.cancel()).rejects.toThrow('secret');});expect(h.result.current.state.status).toBe('running');expect(cancel).toHaveBeenCalledTimes(1);expect(load).toHaveBeenCalledTimes(1);
});
it.each(['before','after'] as const)('terminal server success %s cancel resolution wins',async order=>{
 const work=deferred<TaskState<boolean>>(),remote=deferred<boolean>(),load=vi.fn(()=>work.promise),cancel=vi.fn(()=>remote.promise);const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load},cancel}));let pending!:Promise<boolean>;act(()=>{pending=h.result.current.cancel();});
 await act(async()=>{if(order==='after'){remote.resolve(true);await pending;}work.resolve({id:'job',status:'succeeded',result:false});await flush();if(order==='before'){remote.resolve(true);await pending;}});expect(h.result.current.state.status).toBe('succeeded');expect(h.result.current.state.result).toBe(false);
});
it('read failures retry at most three times with bounded backoff; manual retry restarts read only',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0);const load=vi.fn().mockRejectedValue(new Error('secret'));const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load}}));await act(flush);expect(h.result.current.connection).toBe('reconnecting');
 for(const ms of [999,1,1999,1,3999,1])await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});expect(load).toHaveBeenCalledTimes(4);expect(h.result.current.connection).toBe('error');
 await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});expect(load).toHaveBeenCalledTimes(4);await act(async()=>{h.result.current.retry();await flush();});expect(load).toHaveBeenCalledTimes(5);
});
it('retry during an outstanding poll cannot overlap it',async()=>{
 const load=vi.fn(()=>new Promise<TaskState<number>>(()=>{}));const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load}}));act(()=>{h.result.current.retry();h.result.current.retry();});expect(load).toHaveBeenCalledTimes(1);
});
it('regressions, mismatched IDs and malformed states are ignored with static diagnostics',async()=>{
 let emit!:(state:TaskState<number>)=>void;const subscribe=(_id:string,onState:typeof emit)=>{emit=onState;return()=>{};};const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});const h=renderHook(()=>useTask({id:'job',scopeKey:'private-scope',source:{mode:'stream',subscribe}}));
 act(()=>{emit({id:'job',status:'running'});emit({id:'job',status:'queued',message:'secret'});emit({id:'different',status:'failed'});emit({id:'job',status:'invalid' as 'idle'});});expect(h.result.current.state.status).toBe('running');expect(warning).toHaveBeenCalled();expect(warning.mock.calls.flat().join(' ')).not.toContain('secret');expect(warning.mock.calls.flat().join(' ')).not.toContain('private-scope');
 act(()=>{emit({id:'job',status:'succeeded'});emit({id:'job',status:'failed'});});expect(h.result.current.state.status).toBe('succeeded');
});
it('unmounted retained retry/cancel never invokes consumer work',async()=>{
 const load=vi.fn(()=>new Promise<TaskState<number>>(()=>{})),cancel=vi.fn(async()=>true);const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load},cancel}));const saved=h.result.current;h.unmount();saved.retry();expect(await saved.cancel()).toBe(false);expect(cancel).not.toHaveBeenCalled();expect(load).toHaveBeenCalledTimes(1);
});
it('stream errors retain task state; explicit retry reconnects and ignores old events',()=>{
 let emit!:(state:TaskState<number>)=>void,fail!:(error:unknown)=>void;const stops:ReturnType<typeof vi.fn>[]=[];const subscribe=vi.fn((_id:string,onState:typeof emit,onError:typeof fail)=>{emit=onState;fail=onError;const stop=vi.fn();stops.push(stop);return stop;});const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}));const stale=emit;act(()=>{emit({id:'job',status:'running'});fail(new Error('secret'));});expect(h.result.current.connection).toBe('error');expect(h.result.current.state.status).toBe('running');expect(stops[0]).toHaveBeenCalledTimes(1);act(()=>h.result.current.retry());expect(subscribe).toHaveBeenCalledTimes(2);act(()=>stale({id:'job',status:'failed'}));expect(h.result.current.state.status).toBe('running');h.unmount();expect(stops[1]).toHaveBeenCalledTimes(1);
});
it('initial terminal state is deterministic and starts no transport',()=>{
 const load=vi.fn();const initial:TaskState<number>={id:'job',status:'succeeded',result:0};const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load},initialState:initial}));expect(h.result.current.state).toBe(initial);expect(load).not.toHaveBeenCalled();
});
it('hidden documents pause polling until visible without overlapping',async()=>{
 vi.useFakeTimers();vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');const load=vi.fn(async()=>({id:'job',status:'running' as const}));renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'poll',load}}));await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});expect(load).not.toHaveBeenCalled();vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');act(()=>document.dispatchEvent(new Event('visibilitychange')));await act(flush);expect(load).toHaveBeenCalledTimes(1);
});
it('poll and stream retain raw generic result identity without serialization',async()=>{
 const raw={fn:()=>false,n:0};let emit!:(state:TaskState<typeof raw>)=>void;const source:TaskSource<typeof raw>={mode:'stream',subscribe:(_id,onState)=>{emit=onState;return()=>{};}};const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source}));act(()=>emit({id:'job',status:'succeeded',result:raw}));expect(h.result.current.state.result).toBe(raw);expect(h.result.current.state.result?.fn()).toBe(false);
});

it('removed hook cannot invoke retained cancel in a later sibling layout effect',()=>{
 const remote=vi.fn(async()=>true),subscribe=vi.fn(()=>()=>{});let saved=async()=>false;
 function Owner(){const task=useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe},cancel:remote});useLayoutEffect(()=>{saved=task.cancel;},[task.cancel]);return null;}
 function Later({removed}:{removed:boolean}){useLayoutEffect(()=>{if(removed)void saved();},[removed]);return null;}
 const view=render(<><Owner/><Later removed={false}/></>);view.rerender(<><Later removed/></>);expect(remote).not.toHaveBeenCalled();
});

it('invalid state diagnostics work in browser runtimes without a process global',()=>{
 let emit!:(state:TaskState<number>)=>void;const subscribe=(_id:string,onState:typeof emit)=>{emit=onState;return()=>{};};const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}));
 let thrown:unknown;vi.stubGlobal('process',undefined);try{emit({id:'different',status:'running'});}catch(error){thrown=error;}finally{vi.unstubAllGlobals();}
 expect(thrown).toBeUndefined();expect(warning).toHaveBeenCalledTimes(1);expect(h.result.current.state.status).toBe('idle');
});
