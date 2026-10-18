import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFormValidation, type ValidationIssue, type ValidationResult, type Validator } from './form-validation.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
afterEach(cleanup);

describe('F14 validation lifecycle', () => {
  it('validates an explicit immutable snapshot and publishes typed issues', async () => {
    const work = deferred<readonly ValidationIssue<'name'>[]>();
    const validate = vi.fn<Validator<{name: string}>>(() => work.promise);
    const createSnapshot = vi.fn((values: {name: string}) => Object.freeze({...values}));
    const hook = renderHook(() => useFormValidation({validate, createSnapshot}));
    const values = {name: 'Before'};
    let run!: Promise<ValidationResult<'name'>>;
    act(() => { run = hook.result.current.validate(values); });
    values.name = 'After';
    expect(hook.result.current.pending).toBe(true);
    expect(createSnapshot).toHaveBeenCalledOnce();
    expect(validate.mock.calls[0]?.[0]).toEqual({name: 'Before'});
    const issues = [{field: 'name' as const, code: 'required', message: 'Nhập tên'}];
    await act(async () => { work.resolve(issues); expect(await run).toEqual({status: 'validated', issues}); });
    expect(hook.result.current.issues).toEqual(issues);
    expect(hook.result.current.pending).toBe(false);
  });

  it.each(['cancel', 'reset', 'unmount'] as const)('%s settles an ignored abort and consumes a late rejection', async action => {
    const work = deferred<readonly ValidationIssue<'name'>[]>();
    let signal!: AbortSignal;
    const hook = renderHook(() => useFormValidation<{name: string}>({
      createSnapshot: values => ({...values}),
      validate: (_, context) => { signal = context.signal; return work.promise; },
    }));
    let run!: Promise<ValidationResult<'name'>>;
    act(() => { run = hook.result.current.validate({name: ''}); });
    await act(async () => {
      if (action === 'unmount') hook.unmount(); else hook.result.current[action]();
      expect(await run).toEqual({status: 'cancelled', reason: action === 'cancel' ? 'cancelled' : action === 'reset' ? 'reset' : 'unmounted'});
    });
    expect(signal.aborted).toBe(true);
    await act(async () => { work.reject(new Error('Late secret error')); await Promise.resolve(); });
  });

  it('latest validation supersedes the old generation without allowing late issues to overwrite it', async () => {
    const old = deferred<readonly ValidationIssue<'name'>[]>();
    const next = deferred<readonly ValidationIssue<'name'>[]>();
    const hook = renderHook(() => useFormValidation<{name: string}>({createSnapshot: values => ({...values}), validate: values => values.name === 'old' ? old.promise : next.promise}));
    let first!: Promise<ValidationResult<'name'>>, second!: Promise<ValidationResult<'name'>>;
    act(() => { first = hook.result.current.validate({name: 'old'}); });
    act(() => { second = hook.result.current.validate({name: 'new'}); });
    await act(async () => { expect(await first).toEqual({status: 'cancelled', reason: 'superseded'}); });
    expect(hook.result.current.pending).toBe(true);
    await act(async () => { next.resolve([]); expect(await second).toEqual({status: 'validated', issues: []}); });
    await act(async () => { old.resolve([{field: 'name', code: 'old', message: 'Old'}]); await Promise.resolve(); });
    expect(hook.result.current.issues).toEqual([]);
  });

  it('errors are explicit results and a throwing mapper cannot leak raw failures', async () => {
    const hook = renderHook(() => useFormValidation<{name: string}>({createSnapshot: values => ({...values}),
      validate: () => { throw new Error('Secret stack'); },
      mapError: () => { throw new Error('Mapper stack'); },
    }));
    let outcome!: ValidationResult<'name'>;
    await act(async () => { outcome = await hook.result.current.validate({name: ''}); });
    expect(outcome.status).toBe('error');
    expect(JSON.stringify(outcome)).not.toMatch(/Secret|Mapper|stack/);
    expect(hook.result.current.pending).toBe(false);
    expect(hook.result.current.issues).toEqual([]);
  });

  it('reset clears previous issues and a saved validate reference cannot run after unmount', async () => {
    const validate = vi.fn(() => [{field: 'name' as const, code: 'required', message: 'Required'}]);
    const hook = renderHook(() => useFormValidation<{name: string}>({createSnapshot: values => ({...values}), validate}));
    await act(async () => { await hook.result.current.validate({name: ''}); });
    expect(hook.result.current.issues).toHaveLength(1);
    act(() => hook.result.current.reset());
    expect(hook.result.current.issues).toEqual([]);
    const run = hook.result.current.validate;
    hook.unmount();
    expect(await run({name: ''})).toEqual({status: 'cancelled', reason: 'unmounted'});
    expect(validate).toHaveBeenCalledOnce();
  });

  it('cancellation from the snapshot callback prevents obsolete validator work', async () => {
    const validate = vi.fn(() => []);
    const hook = renderHook(() => useFormValidation<{name: string}>({validate,
      createSnapshot: values => {hook.result.current.cancel(); return {...values};},
    }));
    let outcome!: ValidationResult<'name'>;
    await act(async () => { outcome = await hook.result.current.validate({name: ''}); });
    expect(outcome).toEqual({status: 'cancelled', reason: 'cancelled'});
    expect(validate).not.toHaveBeenCalled();
  });

  it('cancellation from the error mapper wins over the mapped error result', async () => {
    const hook = renderHook(() => useFormValidation<{name: string}>({createSnapshot: values => ({...values}),
      validate: () => {throw new Error('failure');},
      mapError: () => {hook.result.current.cancel(); return 'Mapped error';},
    }));
    let outcome!: ValidationResult<'name'>;
    await act(async () => { outcome = await hook.result.current.validate({name: ''}); });
    expect(outcome).toEqual({status: 'cancelled', reason: 'cancelled'});
    expect(hook.result.current.pending).toBe(false);
  });
});
