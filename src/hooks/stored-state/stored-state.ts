'use client';

import {useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore} from 'react';

/** Non-abortable consumer transport. Cleanup ignores late reads and queued work. */
export type StorageAdapter = {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};
export type StoredStateOptions<T> = {
  key: string;
  scopeKey: string;
  version: number;
  initial: T;
  adapter: StorageAdapter;
  encode: (value: T) => string;
  decode: (value: string) => T;
  migrate?: (oldPayload: string, oldVersion: number) => T;
};
export type StoredState<T> = {
  value: T;
  setValue: (value: T) => void;
  status: 'loading' | 'ready' | 'error';
  reset: () => Promise<void>;
};
type Snapshot<T> = Pick<StoredState<T>, 'value' | 'status'>;
const validVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** One store per mounted hook identity; no module cache or cross-tab merge. */
function createStore<T>(options: StoredStateOptions<T>, queue: {tail: Promise<void>}) {
  const {key, scopeKey, version} = options;
  const {read, write, remove} = options.adapter;
  const storageKey = JSON.stringify(['nova', scopeKey, key]);
  const serverSnapshot: Snapshot<T> = {value: options.initial, status: 'loading'};
  let snapshot = serverSnapshot;
  let inputs = options;
  let live = true;
  let readGeneration = 0;
  let writeGeneration = 0;
  // This starts at creation, before any layout-effect setValue and passive read.
  let localRevision = 0;
  const listeners = new Set<() => void>();
  type PendingWrite = {bytes: string; generation: number; revision: number; queued: boolean};
  const pendingWrites = new Set<PendingWrite>();
  let pendingOutcome: {generation: number; revision: number; status: 'ready' | 'error'} | undefined;
  function publish(value: T, status: Snapshot<T>['status']) {
    snapshot = {value, status};
    for (const listener of listeners) listener();
  }
  function complete(generation: number, revision: number, status: 'ready' | 'error') {
    if (generation !== writeGeneration || revision !== localRevision) return;
    if (!live) {
      // Retain only the outcome, never retry I/O or notify disconnected React.
      // A permanently disposed owner never activates to consume this result.
      pendingOutcome = {generation, revision, status};
      return;
    }
    publish(status === 'error' ? inputs.initial : snapshot.value, status);
  }
  function encode(value: T) {
    const payload = inputs.encode(value);
    if (typeof payload !== 'string') throw new Error('Invalid storage payload');
    return payload;
  }
  function setValue(value: T) {
    if (!live) return;
    const revision = ++localRevision;
    const generation = writeGeneration;
    let bytes: string;
    try {
      if (!validVersion(version)) throw new Error('Invalid storage version');
      bytes = JSON.stringify({version, payload: encode(value)});
    } catch {
      publish(inputs.initial, 'error');
      return;
    }
    publish(value, 'ready');
    // StrictMode may replay an identical setter before either job starts.
    const previous = Array.from(pendingWrites).at(-1);
    if (previous && previous.generation === generation && previous.bytes === bytes) {
      previous.revision = revision;
      schedule(previous);
      return;
    }
    const job: PendingWrite = {bytes, generation, revision, queued: false};
    pendingWrites.add(job);
    schedule(job);
  }
  function schedule(job: PendingWrite) {
    if (job.queued || !pendingWrites.has(job)) return;
    job.queued = true;
    queue.tail = queue.tail.then(async () => {
      job.queued = false;
      if (job.generation !== writeGeneration) {
        pendingWrites.delete(job);
        return;
      }
      // A disconnected owner performs no queued I/O. Keep the logical job only
      // for that same owner's reconnect; disposed owners never reactivate.
      if (!live) return;
      pendingWrites.delete(job);
      try {
        await write(storageKey, job.bytes);
        complete(job.generation, job.revision, 'ready');
      } catch {
        complete(job.generation, job.revision, 'error');
      }
    });
  }
  function reset(): Promise<void> {
    if (!live) return Promise.resolve();
    const generation = ++writeGeneration;
    pendingWrites.clear();
    const revision = ++localRevision;
    ++readGeneration;
    publish(inputs.initial, 'ready');
    // Keep removal in the same tail, even when another reset supersedes it.
    // Started writes settle first; later explicit sets queue after this removal.
    queue.tail = queue.tail.then(async () => {
      try {
        await remove(storageKey);
        complete(generation, revision, 'ready');
      } catch {
        complete(generation, revision, 'error');
      }
    });
    return queue.tail;
  }
  function connect() {
    live = true;
    const generation = ++readGeneration;
    const canApply = () => live && generation === readGeneration && localRevision === 0;
    void (async () => {
      try {
        if (!validVersion(version)) throw new Error('Invalid storage version');
        const bytes = await read(storageKey);
        if (!canApply()) return;
        if (bytes === null) {
          publish(inputs.initial, 'ready');
          return;
        }
        const envelope: unknown = JSON.parse(bytes);
        if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Invalid storage envelope');
        const data = envelope as Record<string, unknown>;
        if (Object.keys(data).length !== 2 || !validVersion(data.version) || typeof data.payload !== 'string') throw new Error('Invalid storage envelope');
        let value: T;
        if (data.version === version) value = inputs.decode(data.payload);
        else {
          if (data.version > version || !inputs.migrate) throw new Error('Unsupported storage version');
          value = inputs.migrate(data.payload, data.version);
          // Caller codecs validate migrated data; retain the caller's raw T.
          inputs.decode(encode(value));
        }
        if (canApply()) publish(value, 'ready');
      } catch {
        if (canApply()) publish(inputs.initial, 'error');
      }
    })();
    return () => {
      live = false;
      ++readGeneration;
    };
  }
  return {
    setValue, reset, connect,
    activate: () => {
      live = true;
      if (pendingOutcome) {
        const outcome = pendingOutcome;
        pendingOutcome = undefined;
        complete(outcome.generation, outcome.revision, outcome.status);
      }
      for (const job of pendingWrites) schedule(job);
    },
    updateInputs: (next: StoredStateOptions<T>) => {inputs = next;},
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};},
  };
}

/** Persists non-sensitive preferences with caller-owned scope, schema and codec. */
export function useStoredState<T>(options: StoredStateOptions<T>): StoredState<T> {
  const {key, scopeKey, version} = options;
  const {read, write, remove} = options.adapter;
  // The ordered tail belongs to this hook instance across scope/transport changes.
  const [queue] = useState(() => ({tail: Promise.resolve()}));
  // Harmless option/adapter wrappers and codec closures are not storage identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createStore(options, queue), [key, scopeKey, version, read, write, remove, queue]);
  // React StrictMode replays layout effects before reconnecting passive effects.
  useLayoutEffect(() => {store.updateInputs(options); store.activate();}, [store, options]);
  useEffect(() => store.connect(), [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {...snapshot, setValue: store.setValue, reset: store.reset};
}
