import {Activity,Suspense} from 'react';
import {StrictMode,type ReactNode} from 'react';
import {act,cleanup,render,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {TaskProvider} from './task.js';
import {useTask,type TaskState} from '../../hooks/task/task.js';
afterEach(cleanup);
const provider=({children}:{children:ReactNode})=><TaskProvider>{children}</TaskProvider>;
it('case-p2-s06-ac04-unit explicit provider shares stable transport, final subscriber teardown once',()=>{
 let emit!:(state:TaskState<number>)=>void;const stop=vi.fn(),subscribe=vi.fn((_id:string,onState:typeof emit)=>{emit=onState;return stop;});
 function Item({name}:{name:string}){const task=useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}});return <output aria-label={name}>{task.state.status}</output>;}
 const view=render(<TaskProvider><Item name="first"/><Item name="second"/></TaskProvider>);expect(subscribe).toHaveBeenCalledTimes(1);act(()=>emit({id:'job',status:'running'}));expect(view.getByLabelText('first').textContent).toBe('running');expect(view.getByLabelText('second').textContent).toBe('running');
 view.rerender(<TaskProvider><Item name="first"/></TaskProvider>);expect(stop).not.toHaveBeenCalled();view.unmount();expect(stop).toHaveBeenCalledTimes(1);act(()=>emit({id:'job',status:'succeeded'}));expect(stop).toHaveBeenCalledTimes(1);
});
it('case-p2-s06-ac02-unit same ID different scope/source/provider never shares',()=>{
 const stop=vi.fn(),subscribe=vi.fn(()=>stop),other=vi.fn(()=>stop);const h=renderHook(()=>({a:useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}),b:useTask({id:'job',scopeKey:'b',source:{mode:'stream',subscribe}}),c:useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe:other}})}),{wrapper:provider});expect(subscribe).toHaveBeenCalledTimes(2);expect(other).toHaveBeenCalledTimes(1);const isolated=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}),{wrapper:provider});expect(subscribe).toHaveBeenCalledTimes(3);isolated.unmount();h.unmount();expect(stop).toHaveBeenCalledTimes(4);
});
it('outside explicit provider two hooks never share',()=>{const subscribe=vi.fn(()=>()=>{});renderHook(()=>[useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}),useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}})]);expect(subscribe).toHaveBeenCalledTimes(2);});
it('StrictMode retains one live stream, late replay callbacks ignored and each cleanup once',()=>{
 const callbacks:((state:TaskState<number>)=>void)[]=[],stops:ReturnType<typeof vi.fn>[]=[];const subscribe=vi.fn((_id:string,onState:(state:TaskState<number>)=>void)=>{callbacks.push(onState);const stop=vi.fn();stops.push(stop);return stop;});const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}),{reactStrictMode:true,wrapper:({children})=><StrictMode><TaskProvider>{children}</TaskProvider></StrictMode>});expect(callbacks.length).toBeGreaterThanOrEqual(2);expect(stops.filter(s=>s.mock.calls.length===0)).toHaveLength(1);act(()=>{callbacks[0]?.({id:'job',status:'failed'});callbacks.at(-1)?.({id:'job',status:'running'});});expect(h.result.current.state.status).toBe('running');h.unmount();for(const stop of stops)expect(stop).toHaveBeenCalledTimes(1);
});
it('provider poll aborts only on final subscriber, accepts shared raw result',async()=>{
 let resolve!:(state:TaskState<object>)=>void;const load=vi.fn((ctx:{id:string;signal:AbortSignal})=>{void ctx;return new Promise<TaskState<object>>(yes=>{resolve=yes;});});function Item(){useTask({id:'job',scopeKey:'a',source:{mode:'poll',load}});return null;}const view=render(<TaskProvider><Item/><Item/></TaskProvider>);expect(load).toHaveBeenCalledTimes(1);view.rerender(<TaskProvider><Item/></TaskProvider>);expect(load.mock.calls[0]?.[0].signal.aborted).toBe(false);view.unmount();expect(load.mock.calls[0]?.[0].signal.aborted).toBe(true);await act(async()=>resolve({id:'job',status:'succeeded',result:{}}));
});
it('synchronous terminal/error stream callbacks still release returned unsubscribe exactly once',()=>{
 for(const mode of ['terminal','error']){const stop=vi.fn(),subscribe=vi.fn((_id:string,onState:(s:TaskState<number>)=>void,onError:(e:unknown)=>void)=>{if(mode==='terminal')onState({id:'job',status:'succeeded'});else onError(new Error('secret'));return stop;});const h=renderHook(()=>useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}}),{wrapper:provider});expect(stop).toHaveBeenCalledTimes(1);h.unmount();expect(stop).toHaveBeenCalledTimes(1);}
});

it('shared reader retains per-hook cancel callback ownership and current callback',async()=>{
 const subscribe=vi.fn(()=>()=>{}),a=vi.fn(async()=>false),b=vi.fn(async()=>true);
 const h=renderHook(({cancel})=>({a:useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe},cancel}),b:useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe},cancel:b}),none:useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}})}),{wrapper:provider,initialProps:{cancel:a}});
 await act(async()=>{expect(await h.result.current.none.cancel()).toBe(false);expect(await h.result.current.b.cancel()).toBe(true);expect(await h.result.current.a.cancel()).toBe(false);});expect(a).toHaveBeenCalledTimes(1);expect(b).toHaveBeenCalledTimes(1);expect(subscribe).toHaveBeenCalledTimes(1);h.rerender({cancel:b});await act(async()=>{expect(await h.result.current.a.cancel()).toBe(true);});expect(a).toHaveBeenCalledTimes(1);expect(b).toHaveBeenCalledTimes(2);
});

it('S06-R1 Activity reveal rejoins current same-tuple owner after final unsubscribe',async()=>{
 const callbacks:((state:TaskState<{fn:()=>number}>)=>void)[]=[],stops:ReturnType<typeof vi.fn>[]=[];
 const subscribe=vi.fn((_id:string,onState:(state:TaskState<{fn:()=>number}>)=>void)=>{callbacks.push(onState);const stop=vi.fn();stops.push(stop);return stop;});
 const states=new Map<string,TaskState<{fn:()=>number}>>();
 function Item({name}:{name:string}){const task=useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe}});states.set(name,task.state);return <output aria-label={name}>{task.state.status}</output>;}
 function App({hidden,sibling}:{hidden:boolean;sibling:boolean}){return <TaskProvider><Activity mode={hidden?'hidden':'visible'}><Item name="retained"/></Activity>{sibling?<Item name="new"/>:null}</TaskProvider>;}
 const view=render(<App hidden={false} sibling={false}/>);expect(subscribe).toHaveBeenCalledTimes(1);
 await act(async()=>{view.rerender(<App hidden sibling={false}/>);});expect(stops[0]).toHaveBeenCalledTimes(1);
 await act(async()=>{view.rerender(<App hidden sibling/>);});expect(subscribe).toHaveBeenCalledTimes(2);
 const raw={fn:()=>42};act(()=>callbacks[1]?.({id:'job',status:'running',result:raw}));
 await act(async()=>{view.rerender(<App hidden={false} sibling/>);});expect(subscribe).toHaveBeenCalledTimes(2);expect(stops.filter(stop=>stop.mock.calls.length===0)).toHaveLength(1);
 expect(states.get('retained')?.result).toBe(raw);expect(states.get('new')?.result).toBe(raw);
 act(()=>callbacks[0]?.({id:'job',status:'failed',result:{fn:()=>9}}));expect(states.get('retained')?.status).toBe('running');expect(states.get('new')?.status).toBe('running');
 const final={fn:()=>0};act(()=>callbacks[1]?.({id:'job',status:'running',result:final}));expect(states.get('retained')?.result).toBe(final);expect(states.get('new')?.result).toBe(final);
 await act(async()=>{view.rerender(<App hidden sibling/>);});expect(stops[1]).not.toHaveBeenCalled();view.unmount();expect(stops).toHaveLength(2);for(const stop of stops)expect(stop).toHaveBeenCalledTimes(1);
 act(()=>callbacks[1]?.({id:'job',status:'succeeded',result:raw}));for(const stop of stops)expect(stop).toHaveBeenCalledTimes(1);
});
it('S06-R1 abandoned suspended render cannot own a committed tuple or its initial state',()=>{
 const subscribe=vi.fn(()=>()=>{}),pending=new Promise<void>(()=>{}),abandoned={fn:()=>9},committed={fn:()=>0};let current:TaskState<typeof committed>|undefined;
 function Abandoned():ReactNode{useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe},initialState:{id:'job',status:'succeeded',result:abandoned}});throw pending;}
 function Committed(){const task=useTask({id:'job',scopeKey:'a',source:{mode:'stream',subscribe},initialState:{id:'job',status:'running',result:committed}});current=task.state;return <output>{task.state.status}</output>;}
 const view=render(<TaskProvider><Suspense fallback={<span>Waiting</span>}><Abandoned/></Suspense></TaskProvider>);expect(subscribe).not.toHaveBeenCalled();
 view.rerender(<TaskProvider><Committed/></TaskProvider>);expect(subscribe).toHaveBeenCalledTimes(1);expect(current?.status).toBe('running');expect(current?.result).toBe(committed);
});
