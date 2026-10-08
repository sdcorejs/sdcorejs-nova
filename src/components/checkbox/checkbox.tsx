'use client';
// Checkbox (F05, §11, INV-015) on Base UI Checkbox: state `boolean | 'mixed'`
// is separate from the submitted value (`submissionValue`, default 'on'):
// checked → FormData has name=submissionValue; false and 'mixed' submit nothing.
// `ref` → visible control (role=checkbox); `inputRef` → hidden native input that
// receives name/form/required/autoComplete. readOnly → aria-readonly, no emit.
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { useCallback, useState, type ComponentPropsWithRef, type Ref } from 'react';

import { useDiagnostics } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { useControllableValue, useFormReset } from '../../lib/use-controllable-value.js';
import type { ControlProps, ValueProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from '../field/field.js';

export type ToggleNativeProps = {
  name?: string;
  form?: string;
  autoComplete?: ComponentPropsWithRef<'input'>['autoComplete'];
  submissionValue?: string;
  ref?: Ref<HTMLElement>;
  inputRef?: Ref<HTMLInputElement>;
};

export type CheckboxProps = ValueProps<boolean | 'mixed'> & ControlProps & ToggleNativeProps;

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

export function Checkbox(props: CheckboxProps) {
  const {
    value, defaultValue, onValueChange, disabled, readOnly, name, form, autoComplete, submissionValue = 'on',
    ref, inputRef, className, style, title, onBlur, onFocus,
  } = props;
  const control = useFieldControl(props, { component: 'Checkbox', labelPlacement: 'after' });
  const report = useDiagnostics('Checkbox');
  const [current, setValue, resetValue] = useControllableValue<boolean | 'mixed'>({
    value, defaultValue, onValueChange, fallback: false, disabled, readOnly, report,
  });
  const [hiddenInput, hiddenInputRef] = useHiddenInput(autoComplete, inputRef);
  // Native form reset (R15): uncontrolled → back to the mount value without emitting;
  // controlled → the consumer value stays authoritative. The hidden input follows either way.
  const [initial] = useState<boolean | 'mixed'>(defaultValue ?? false);
  // The mount mode is frozen (useControllableValue keeps it after a mode switch).
  const [controlled] = useState(value !== undefined);
  useFormReset(hiddenInput, useCallback(() => {
    if (!controlled) resetValue(initial);
    syncNativeInput(hiddenInput, controlled ? current : initial);
  }, [controlled, current, initial, resetValue, hiddenInput]));
  if (!control.ok) return <FieldControlError code={control.code} component="Checkbox" />;

  return control.wrap(
    <span className="nova-checkbox-root" data-nova-control-root="">
      <BaseCheckbox.Root
        {...passThrough(props)}
        ref={ref}
        id={control.id}
        name={name}
        form={form}
        value={submissionValue}
        checked={current === true}
        indeterminate={current === 'mixed'}
        onCheckedChange={(next) => setValue(next)}
        disabled={disabled}
        readOnly={readOnly}
        required={control.required}
        inputRef={hiddenInputRef}
        aria-label={control.ariaLabel}
        aria-labelledby={control.ariaLabel ? undefined : control.ariaLabelledby ?? control.labelId}
        aria-describedby={control.ariaDescribedby}
        aria-invalid={control.invalid || undefined}
        className={cx('nova-checkbox', className)}
        style={style}
        title={title}
        onBlur={onBlur}
        onFocus={onFocus}
        data-nova-focus-target=""
      >
        <span className="nova-checkbox__box" aria-hidden="true">
          <BaseCheckbox.Indicator className="nova-checkbox__indicator">
            <svg className="nova-checkbox__check" viewBox="0 0 16 16" focusable="false">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <svg className="nova-checkbox__dash" viewBox="0 0 16 16" focusable="false">
              <path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </BaseCheckbox.Indicator>
        </span>
      </BaseCheckbox.Root>
    </span>,
  );
}
