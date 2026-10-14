import {useLayoutEffect,useRef} from 'react';

/** Race consumer work against owner cancellation; the underlying work owns its I/O. */
export function abortable<T>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const remove = () => signal.removeEventListener('abort', cancel);
    const accept = (value: T) => {
      if (settled) return;
      settled = true; remove(); resolve(value);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true; remove(); reject(error);
    };
    const cancel = () => fail(new DOMException('The operation was aborted', 'AbortError'));
    // Attach both outcomes even for an already-aborted owner: late work rejection
    // must remain consumed when the caller has already observed cancellation.
    void Promise.resolve(work).then(accept, fail);
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Native reset is cancellable; callback updates must not cancel already queued restoration. */
export function useNativeFormReset(input:HTMLInputElement|null,formId:string|undefined,reset:()=>void):void {
 const latest=useRef(reset),restored=useRef(false);useLayoutEffect(()=>{latest.current=reset;restored.current=false;});const ownerForm=input?.form;
 useLayoutEffect(()=>{const owner=input?.form;if(!input||!owner)return;const timers=new Set<ReturnType<typeof setTimeout>>();const handle=(event:Event)=>{const timer=setTimeout(()=>{timers.delete(timer);if(!event.defaultPrevented&&input.form===owner&&!restored.current){restored.current=true;latest.current();}},0);timers.add(timer);};owner.addEventListener('reset',handle);return()=>{owner.removeEventListener('reset',handle);for(const timer of timers)clearTimeout(timer);};},[input,formId,ownerForm]);
}
