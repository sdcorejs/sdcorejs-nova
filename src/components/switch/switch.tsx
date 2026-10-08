'use client';
// Switch (F05): boolean only (no 'mixed'), on Base UI Switch. Same form/ref
// contract as Checkbox: submissionValue (default 'on') only when on; `ref` →
// visible role=switch; `inputRef` → hidden input with name/form/required/autoComplete.
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { useCallback, useState, type ComponentPropsWithRef, type Ref } from 'react';

import { useDiagnostics } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { useControllableValue, useFormReset } from '../../lib/use-controllable-value.js';
import type { ControlProps, ValueProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from '../field/field.js';

export type SwitchProps = ValueProps<boolean> & ControlProps & {
  name?: string;
  form?: string;
  autoComplete?: ComponentPropsWithRef<'input'>['autoComplete'];
  submissionValue?: string;
  ref?: Ref<HTMLElement>;
  inputRef?: Ref<HTMLInputElement>;
};

const OWNED = [
  'value', 'defaultValue', 'onValueChange', 'label', 'aria-label', 'aria-labelledby', 'nameFromField', 'description',
  'error', 'required', 'aria-describedby', 'id', 'disabled', 'readOnly', 'className', 'style', 'title', 'onBlur',
  'onFocus', 'name', 'form', 'autoComplete', 'submissionValue', 'ref', 'inputRef',
] as const;

/**
 * Attaches `node` to a consumer ref with React 19 semantics and returns how to
 * detach it: the callback's own cleanup, else `ref(null)`; object refs reset to null.
 */
function attachRef<T>(ref: Ref<T> | undefined, node: T): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(node);
    return typeof cleanup === 'function' ? cleanup : () => ref(null);
  }
  if (ref) {
    (ref as { current: T | null }).current = node;
    return () => {
      (ref as { current: T | null }).current = null;
    };
  }
  return undefined;
}

/**
 * Hidden input ref: moves autoComplete onto the hidden input (Base UI keeps it on
 * the visible span, A-001), forwards `inputRef` with React 19 cleanup, and exposes
 * the node so the native form reset can be observed.
 */
function useHiddenInput(autoComplete: string | undefined, inputRef: Ref<HTMLInputElement> | undefined) {
  const [node, setNode] = useState<HTMLInputElement | null>(null);
  const ref = useCallback((element: HTMLInputElement | null) => {
    if (!element) return undefined;
    if (autoComplete) element.setAttribute('autocomplete', autoComplete);
    else element.removeAttribute('autocomplete');
    setNode(element);
    const detach = attachRef(inputRef, element);
    return () => {
      setNode(null);
      detach?.();
    };
  }, [autoComplete, inputRef]);
  return [node, ref] as const;
}

/** Puts the hidden native input back in line with the visible state after a reset. */
function syncNativeInput(input: HTMLInputElement | null, state: boolean | 'mixed'): void {
  if (!input) return;
  input.checked = state === true;
  input.indeterminate = state === 'mixed';
}

function passThrough(props: object): Record<string, unknown> {
  const rest = { ...props } as Record<string, unknown>;
  for (const key of OWNED) delete rest[key];
  return rest;
}

export function Switch(props: SwitchProps) {
  const {
    value, defaultValue, onValueChange, disabled, readOnly, name, form, autoComplete, submissionValue = 'on',
    ref, inputRef, className, style, title, onBlur, onFocus,
  } = props;
  const control = useFieldControl(props, { component: 'Switch', labelPlacement: 'after' });
  const report = useDiagnostics('Switch');
  const [current, setValue, resetValue] = useControllableValue<boolean>({ value, defaultValue, onValueChange, fallback: false, disabled, readOnly, report });
  const [hiddenInput, hiddenInputRef] = useHiddenInput(autoComplete, inputRef);
  // Native form reset (R15): same contract as Checkbox.
  const [initial] = useState<boolean>(defaultValue ?? false);
  const [controlled] = useState(value !== undefined);
  useFormReset(hiddenInput, useCallback(() => {
    if (!controlled) resetValue(initial);
    syncNativeInput(hiddenInput, controlled ? current : initial);
  }, [controlled, current, initial, resetValue, hiddenInput]));
  if (!control.ok) return <FieldControlError code={control.code} component="Switch" />;

  return control.wrap(
    <span className="nova-switch-root" data-nova-control-root="">
      <BaseSwitch.Root
        {...passThrough(props)}
        ref={ref}
        id={control.id}
        name={name}
        form={form}
        value={submissionValue}
        checked={current}
        onCheckedChange={(next) => setValue(next)}
        disabled={disabled}
        readOnly={readOnly}
        required={control.required}
        inputRef={hiddenInputRef}
        aria-label={control.ariaLabel}
        aria-labelledby={control.ariaLabel ? undefined : control.ariaLabelledby ?? control.labelId}
        aria-describedby={control.ariaDescribedby}
        aria-invalid={control.invalid || undefined}
        className={cx('nova-switch', className)}
        style={style}
        title={title}
        onBlur={onBlur}
        onFocus={onFocus}
        data-nova-focus-target=""
      >
        <span className="nova-switch__track" aria-hidden="true">
          <BaseSwitch.Thumb className="nova-switch__thumb" />
        </span>
      </BaseSwitch.Root>
    </span>,
  );
}
