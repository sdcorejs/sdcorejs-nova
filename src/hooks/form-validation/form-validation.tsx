'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { abortable } from '../../lib/p1-async-lifecycle.js';
import { useNovaScope } from '../../providers/nova/context.js';
import type { LoadContext } from '../../types/index.js';

export type ValidationIssue<K extends string> = {field: K; message: string; code: string};
export type ValidationResult<K extends string> =
  | {status: 'validated'; issues: readonly ValidationIssue<K>[]}
  | {status: 'cancelled'; reason: 'cancelled' | 'superseded' | 'reset' | 'unmounted'}
  | {status: 'error'; message: string};
export type Validator<T> = (values: Readonly<T>, ctx: LoadContext) => readonly ValidationIssue<Extract<keyof T, string>>[] | Promise<readonly ValidationIssue<Extract<keyof T, string>>[]>;

export function useFormValidation<T>(options: {validate: Validator<T>; createSnapshot: (values: T) => Readonly<T>; mapError?: (error: unknown) => string}) {
  type Issue = ValidationIssue<Extract<keyof T, string>>;
  type Result = ValidationResult<Extract<keyof T, string>>;
  type Reason = Extract<Result, {status: 'cancelled'}>['reason'];
  type Attempt = {controller: AbortController; reason: Reason};
  const owner = useRef<Attempt | null>(null);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [issues, setIssues] = useState<readonly Issue[]>([]);
  const {strings} = useNovaScope();

  const stop = useCallback((reason: Reason, clear: boolean) => {
    const active = owner.current;
    owner.current = null;
    if (mounted.current) {
      setPending(false);
      if (clear) setIssues([]);
    }
    if (active) {
      active.reason = reason;
      active.controller.abort();
    }
  }, []);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop('unmounted', false); };
  }, [stop]);

  const validate = useCallback(async (values: T): Promise<Result> => {
    if (!mounted.current) return {status: 'cancelled', reason: 'unmounted'};
    const previous = owner.current;
    const active: Attempt = {controller: new AbortController(), reason: 'superseded'};
    owner.current = active;
    setPending(true);
    if (previous) { previous.reason = 'superseded'; previous.controller.abort(); }
    if (owner.current !== active) return {status: 'cancelled', reason: active.reason};

    const finish = () => {
      if (owner.current !== active) return;
      owner.current = null;
      if (mounted.current) setPending(false);
    };
    try {
      const snapshot = options.createSnapshot(values);
      if (active.controller.signal.aborted || owner.current !== active) return {status: 'cancelled', reason: active.reason};
      const work = options.validate(snapshot, {signal: active.controller.signal});
      const result = await abortable(Promise.resolve(work), active.controller.signal);
      if (active.controller.signal.aborted || owner.current !== active) return {status: 'cancelled', reason: active.reason};
      setIssues(result);
      finish();
      return {status: 'validated', issues: result};
    } catch (error) {
      if (active.controller.signal.aborted || owner.current !== active) return {status: 'cancelled', reason: active.reason};
      let message = strings.feedback.errorDefault;
      try { message = options.mapError?.(error) || message; } catch { /* Keep the localized safe fallback. */ }
      if (active.controller.signal.aborted || owner.current !== active) return {status: 'cancelled', reason: active.reason};
      finish();
      return {status: 'error', message};
    }
  }, [options, strings.feedback.errorDefault]);

  const cancel = useCallback(() => stop('cancelled', false), [stop]);
  const reset = useCallback(() => stop('reset', true), [stop]);
  return {validate, pending, issues, cancel, reset};
}
