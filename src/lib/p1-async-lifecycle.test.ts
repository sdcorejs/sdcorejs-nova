import { describe, expect, it, vi } from 'vitest';

import { abortable } from './p1-async-lifecycle.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function flush() { await Promise.resolve(); await Promise.resolve(); }

describe('owner cancellation of asynchronous work', () => {
  it('preserves values and the original work failure', async () => {
    const signal = new AbortController().signal;
    await expect(abortable(Promise.resolve(0), signal)).resolves.toBe(0);
    const error = new Error('failed');
    await expect(abortable(Promise.reject(error), signal)).rejects.toBe(error);
  });

  it('already-aborted owners cannot accept an immediately fulfilled result', async () => {
    const owner = new AbortController(); owner.abort();
    await expect(abortable(Promise.resolve(7), owner.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('settles cancellation even if work ignores the signal', async () => {
    const owner = new AbortController(), work = deferred<number>();
    let outcome: unknown = 'pending';
    void abortable(work.promise, owner.signal).then(value => { outcome = value; }, error => { outcome = error; });
    owner.abort(); await flush();
    expect(outcome).toMatchObject({ name: 'AbortError' });
    work.resolve(9); await flush();
    expect(outcome).toMatchObject({ name: 'AbortError' });
  });

  it('consumes late work rejection without replacing the cancelled outcome', async () => {
    const owner = new AbortController(), work = deferred<number>();
    const failure = vi.fn();
    void abortable(work.promise, owner.signal).catch(failure);
    owner.abort(); await flush();
    expect(failure).toHaveBeenCalledTimes(1);
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
    work.reject(new Error('late failure')); await flush();
    expect(failure).toHaveBeenCalledTimes(1);
  });

  it('removes its abort listener after successful completion', async () => {
    const owner = new AbortController();
    const remove = vi.spyOn(owner.signal, 'removeEventListener');
    await expect(abortable(Promise.resolve(false), owner.signal)).resolves.toBe(false);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('separate owners cancel independently', async () => {
    const a = new AbortController(), b = new AbortController();
    const work = deferred<number>(), resultA = abortable(work.promise, a.signal), resultB = abortable(work.promise, b.signal);
    const failure = vi.fn(); void resultA.catch(failure);
    a.abort(); await flush(); expect(failure).toHaveBeenCalledTimes(1);
    work.resolve(3); await expect(resultB).resolves.toBe(3);
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
  });
});
