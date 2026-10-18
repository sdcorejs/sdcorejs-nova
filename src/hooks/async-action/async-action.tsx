'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { abortable } from '../../lib/p1-async-lifecycle.js';
import type { LoadContext } from '../../types/index.js';

export class ActionInProgressError extends Error {
  readonly code = 'ACTION_IN_PROGRESS';
  constructor() { super('An action is already in progress'); this.name = 'ActionInProgressError'; }
}

export function useAsyncAction<A extends readonly unknown[], R>(action: (ctx: LoadContext, ...args: A) => Promise<R>) {
  const owner = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const active = owner.current; owner.current = null; active?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    const active = owner.current;
    if (!active) return;
    owner.current = null;
    if (mounted.current) { setPending(false); setError(null); }
    // Abort listeners may synchronously run a replacement; publish the old
    // cancellation state before dispatch so it cannot overwrite that attempt.
    active.abort();
  }, []);

  const run = useCallback((...args: A): Promise<R> => {
    if (!mounted.current) return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    if (owner.current) return Promise.reject(new ActionInProgressError());
    const active = new AbortController(); owner.current = active;
    setPending(true); setError(null);
    let work: Promise<R>;
    try { work = action({ signal: active.signal }, ...args); }
    catch (failure) { work = Promise.reject(failure); }
    const finish = (failure: unknown) => {
      // A cancelled generation cannot clear or replace a newer invocation.
      if (owner.current !== active) return;
      owner.current = null;
      if (mounted.current) { setPending(false); setError(failure); }
    };
    return abortable(work, active.signal).then(value => {
      if (active.signal.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      finish(null); return value;
    }, failure => {
      if (active.signal.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      finish(failure); throw failure;
    });
  }, [action]);

  return { run, pending, error, cancel };
}
