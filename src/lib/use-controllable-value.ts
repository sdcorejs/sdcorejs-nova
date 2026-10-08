// Controlled/uncontrolled value (G-STATE, INV-008): controlled when `value` is
// present (including null); defaultValue read once at mount; a mode switch
// reports once and keeps the mount mode; callbacks are proposals; disabled and
// readOnly never emit.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DiagnosticCode } from './diagnostics.js';

export type ControllableOptions<T> = {
  value?: T;
  defaultValue?: T;
  onValueChange?: ((next: T) => void) | undefined;
  /** Uncontrolled value when no defaultValue is given. */
  fallback: T;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  report?: ((code: DiagnosticCode) => void) | undefined;
};

export function useControllableValue<T>(options: ControllableOptions<T>): [T, (next: T) => void, (next: T) => void] {
  const { value, defaultValue, onValueChange, fallback, disabled, readOnly, report } = options;
  const isControlledNow = value !== undefined;
  const [controlledAtMount] = useState(isControlledNow);
  const [internal, setInternal] = useState<T>(() => (defaultValue === undefined ? fallback : defaultValue));
  // Last controlled value, kept if the consumer later drops `value` (mode stays controlled).
  const [lastControlled, setLastControlled] = useState<T>(value as T);
  if (controlledAtMount && isControlledNow && !Object.is(value, lastControlled)) setLastControlled(value as T);

  const modeChanged = controlledAtMount !== isControlledNow;
  const reported = useRef(false);
  useEffect(() => {
    if (modeChanged && !reported.current) {
      reported.current = true;
      report?.('NOVA_CONTROLLED_MODE_CHANGE');
    }
  }, [modeChanged, report]);

  const current = controlledAtMount ? (isControlledNow ? (value as T) : lastControlled) : internal;

  const setValue = useCallback(
    (next: T) => {
      if (disabled || readOnly) return;
      if (!controlledAtMount) setInternal(next);
      onValueChange?.(next);
    },
    [controlledAtMount, disabled, readOnly, onValueChange],
  );

  // Native form reset: restore the uncontrolled value without emitting a proposal
  // (a reset fires no input/change event). Controlled values stay consumer-owned.
  const resetValue = useCallback((next: T) => {
    if (!controlledAtMount) setInternal(next);
  }, [controlledAtMount]);

  return [current, setValue, resetValue];
}

/**
 * Calls `onReset` after the native reset of the form that owns `input`
 * (including `form="id"` association). The reset event fires before the browser
 * restores defaults and may be cancelled, so the check runs on the next task.
 */
export function useFormReset(input: HTMLInputElement | null, onReset: () => void): void {
  const form = input?.form ?? null;
  useEffect(() => {
    if (!form) return undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const handle = (event: Event) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!event.defaultPrevented) onReset();
      }, 0);
      timers.add(timer);
    };
    form.addEventListener('reset', handle);
    return () => {
      form.removeEventListener('reset', handle);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [form, onReset]);
}
