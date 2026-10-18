import { cleanup, act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery, useViewport } from './viewport.js';

function environment(width: number, height: number, matches: boolean) {
  const mediaListeners=new Set<() => void>(), resizeListeners=new Set<() => void>(), frames=new Map<number,FrameRequestCallback>();
  let frame=0;
  const media={matches, addEventListener:vi.fn((_type:string,fn:() => void) => {mediaListeners.add(fn);}),removeEventListener:vi.fn((_type:string,fn:() => void) => {mediaListeners.delete(fn);})};
  const host={innerWidth:width,innerHeight:height, matchMedia:vi.fn(() => media),addEventListener:vi.fn((_type:string,fn:() => void) => {resizeListeners.add(fn);}),removeEventListener:vi.fn((_type:string,fn:() => void) => {resizeListeners.delete(fn);}),requestAnimationFrame:vi.fn((fn:FrameRequestCallback) => {const id=frame++;frames.set(id,fn);return id;}),cancelAnimationFrame:vi.fn((id:number) => {frames.delete(id);})};
  return {ownerWindow:host as unknown as Window,host,media,frames,resizeListeners,mediaListeners,
    resize(w:number,h:number) {host.innerWidth=w;host.innerHeight=h;for(const fn of resizeListeners)fn();},
    flush() {const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(0);},
    mediaChange(value:boolean) {media.matches=value;for(const fn of mediaListeners)fn();}};
}

afterEach(cleanup);

describe('viewport snapshots and environment ownership', () => {
  it('the first media snapshot uses explicit serverMatch before reading the client environment', () => {
    const host=environment(100,100,false), seen:boolean[]=[];
    const hook=renderHook(() => {const value=useMediaQuery('(min-width: 800px)',{serverMatch:true,ownerWindow:host.ownerWindow});seen.push(value);return value;});
    expect(seen[0]).toBe(true);expect(hook.result.current).toBe(false);
    expect(host.host.matchMedia).toHaveBeenCalledWith('(min-width: 800px)');
  });
  it('media subscriptions update, detach on owner change and clean up on unmount', () => {
    const a=environment(1,1,false),b=environment(2,2,true);
    const hook=renderHook(({ownerWindow}) => useMediaQuery('screen',{ownerWindow}),{initialProps:{ownerWindow:a.ownerWindow}});
    act(() => {a.mediaChange(true);});expect(hook.result.current).toBe(true);
    hook.rerender({ownerWindow:b.ownerWindow});expect(a.mediaListeners.size).toBe(0);expect(b.mediaListeners.size).toBe(1);
    hook.unmount();expect(b.mediaListeners.size).toBe(0);
  });
  it('zero server width is distinct from missing dimensions and client dimensions update only after commit', () => {
    const host=environment(390,844,false),seen:(number|undefined)[]=[];
    const hook=renderHook(() => {const value=useViewport({serverWidth:0,ownerWindow:host.ownerWindow});seen.push(value.width);return value;});
    expect(seen[0]).toBe(0);expect(hook.result.current).toEqual({width:390,height:844});
    const absent=renderHook(() => useViewport({ownerWindow:null}));expect(absent.result.current).toEqual({width:undefined,height:undefined});
    const zero=renderHook(() => useViewport({serverWidth:0,serverHeight:0,ownerWindow:null}));expect(zero.result.current).toEqual({width:0,height:0});
  });
  it('resize events coalesce into one frame and preserve width zero', () => {
    const host=environment(390,844,false),hook=renderHook(() => useViewport({ownerWindow:host.ownerWindow}));
    act(() => {host.resize(0,0);host.resize(0,0);});expect(host.frames.size).toBe(1);
    act(() => {host.flush();});expect(hook.result.current).toEqual({width:0,height:0});
  });
  it('unmount removes resize listeners and cancels a pending frame including frame id zero', () => {
    const host=environment(390,844,false),hook=renderHook(() => useViewport({ownerWindow:host.ownerWindow}));
    act(() => {host.resize(320,600);});expect(host.frames.size).toBe(1);
    hook.unmount();expect(host.resizeListeners.size).toBe(0);expect(host.frames.size).toBe(0);expect(host.host.cancelAnimationFrame).toHaveBeenCalledWith(0);
  });
  it('two owner environments have independent snapshots, listener sets and frames', () => {
    const a=environment(390,844,true),b=environment(800,600,false);
    const hook=renderHook(() => ({a:useViewport({ownerWindow:a.ownerWindow}),b:useViewport({ownerWindow:b.ownerWindow}),ma:useMediaQuery('screen',{ownerWindow:a.ownerWindow}),mb:useMediaQuery('screen',{ownerWindow:b.ownerWindow})}));
    expect(hook.result.current.ma).toBe(true);expect(hook.result.current.mb).toBe(false);
    act(() => {a.resize(360,640);a.flush();a.mediaChange(false);});
    expect(hook.result.current.a.width).toBe(360);expect(hook.result.current.b.width).toBe(800);
    expect(hook.result.current.ma).toBe(false);expect(hook.result.current.mb).toBe(false);
    hook.unmount();expect(a.resizeListeners.size+b.resizeListeners.size+a.mediaListeners.size+b.mediaListeners.size).toBe(0);
  });
});
