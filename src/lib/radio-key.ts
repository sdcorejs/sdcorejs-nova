// Radio value codec (INV-015, architecture §11): state is the typed key K,
// form values are collision-free strings; failures are deterministic by order.
import type { Key } from '../types/index.js';

export type RadioKeyMap =
  | { ok: true; serialized: string[] }
  | { ok: false; code: 'NOVA_RADIO_NONFINITE_KEY' | 'NOVA_RADIO_DUPLICATE_KEY'; index: number };

/** `1` → `n:1`, `'1'` → `s:1`. */
export function defaultSerializeKey(key: Key): string {
  return typeof key === 'number' ? `n:${String(key)}` : `s:${key}`;
}

export function buildRadioKeyMap<O extends { value: Key }>(
  options: readonly O[],
  serialize?: (key: O['value']) => string,
): RadioKeyMap {
  const serialized: string[] = [];
  const seen = new Set<string>();
  for (const [index, option] of options.entries()) {
    if (typeof option.value === 'number' && !Number.isFinite(option.value)) {
      return { ok: false, code: 'NOVA_RADIO_NONFINITE_KEY', index };
    }
    const value = serialize ? serialize(option.value) : defaultSerializeKey(option.value);
    if (seen.has(value)) return { ok: false, code: 'NOVA_RADIO_DUPLICATE_KEY', index };
    seen.add(value);
    serialized.push(value);
  }
  return { ok: true, serialized };
}

/** Index of the option whose value is `===` to `value`, or -1. */
export function findOptionIndex(options: readonly { value: Key }[], value: Key | null): number {
  if (value === null) return -1;
  return options.findIndex((option) => option.value === value);
}
