'use client';
import {useCallback,useContext,useMemo,useRef,useLayoutEffect,useSyncExternalStore} from 'react';
import {TaskContext} from '../../providers/task/task.js';
import {TaskStore,terminal,type TaskSource,type TaskState,type TaskSnapshot,type TaskSubscription} from '../../providers/task/task-store.js';
import {useNovaScope} from '../../providers/nova/context.js';
export type {TaskSource,TaskState,TaskStatus,TaskConnection} from '../../providers/task/task-store.js';
export type UseTaskOptions<T>={id:string;scopeKey:string;source:TaskSource<T>;initialState?:TaskState<T>;cancel?:(id:string)=>Promise<boolean>};
export type UseTaskResult<T>=TaskSnapshot<T>&{retry:()=>void;cancel:()=>Promise<boolean>};
/** Stabilize load/subscribe in consumers. Fresh source wrappers do not change the owner. */
export function useTask<T>({id,scopeKey,source,initialState,cancel:remoteCancel}:UseTaskOptions<T>):UseTaskResult<T>{
 const registry=useContext(TaskContext),{diagnostics}=useNovaScope();
 const mode=source.mode,load=source.mode==='poll'?source.load:undefined,subscribe=source.mode==='stream'?source.subscribe:undefined;
 const interval=source.mode==='poll'?source.intervalMs:undefined;
 // interval and initialState are mount configuration, never transport identity.
 const store=useMemo(()=>{
  const adapter:TaskSource<T>=mode==='poll'?{mode,load:load!,intervalMs:interval}:{mode,subscribe:subscribe!};
  return registry?registry.get(scopeKey,id,adapter,initialState,diagnostics):new TaskStore(id,adapter,initialState,diagnostics);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[registry,scopeKey,id,mode,load,subscribe,diagnostics]);
 const owner=useRef<TaskSubscription<T>|null>(null);
 useLayoutEffect(()=>{owner.current=store;return()=>{owner.current=null;};},[store]);
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
 const cancel=useCallback(async()=>{
  if(owner.current!==store||!store.active||terminal(store.getSnapshot().state.status)||!remoteCancel)return false;
  // An acknowledgement is not a server terminal payload. Continue reconciliation.
  return remoteCancel(id);
 },[store,remoteCancel,id]);
 const retry=useCallback(()=>{if(owner.current===store)store.retry();},[store]);
 return {...snapshot,retry,cancel};
}
