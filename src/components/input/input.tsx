'use client';
// Input / Textarea (F02, §11): emit the native value of every input event —
// no trim, case change, normalization or composition buffering — and never
// write the DOM from an effect. Ref and native props (name, form, required,
// autoComplete, disabled, readOnly, …) reach the <input>/<textarea> itself.
import { useState, type ChangeEvent, type InputEvent, type InputEventHandler } from 'react';

import { useDiagnostics } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { useControllableValue } from '../../lib/use-controllable-value.js';
import type { ControlProps, NativeInputProps, NativeTextareaProps, ValueProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from '../field/field.js';

export type InputProps = ValueProps<string> & ControlProps & NativeInputProps & {
  type?: 'text' | 'email' | 'url' | 'password' | 'search' | 'tel';
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
};

export type TextareaProps = ValueProps<string> & ControlProps & NativeTextareaProps & {
  rows?: number;
  maxLength?: number;
  resize?: 'vertical' | 'none';
};

// Props Nova owns or resolves itself; everything else is forwarded natively.
const OWNED = [
  'value', 'defaultValue', 'onValueChange', 'label', 'aria-label', 'aria-labelledby', 'nameFromField',
  'description', 'error', 'required', 'aria-describedby', 'id', 'disabled', 'readOnly', 'className', 'ref',
] as const;

function nativeProps<P extends object>(props: P): Omit<P, (typeof OWNED)[number]> {
  const rest = { ...props } as Record<string, unknown>;
  for (const key of OWNED) delete rest[key];
  return rest as Omit<P, (typeof OWNED)[number]>;
}

type TextControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * Emits on every native `input` event. React's onChange is skipped for those: after a
 * native form reset its value tracker still holds the pre-reset value and would drop
 * the first edit that types it back (R14). onChange still emits for a bare `change`.
 * A consumer's own onInput runs first.
 */
function editHandlers<E extends TextControl>(setValue: (next: string) => void, onInput: InputEventHandler<E> | undefined) {
  return {
    onInput: (event: InputEvent<E>) => {
      onInput?.(event);
      setValue(event.currentTarget.value);
    },
    onChange: (event: ChangeEvent<E>) => {
      if (event.nativeEvent.type !== 'input') setValue(event.currentTarget.value);
    },
  };
}

export function Input(props: InputProps) {
  const { value, defaultValue, onValueChange, disabled, readOnly, className, ref } = props;
  const { type = 'text', ...native } = nativeProps(props);
  const control = useFieldControl(props, { component: 'Input' });
  const report = useDiagnostics('Input');
  const [current, setValue] = useControllableValue<string>({ value, defaultValue, onValueChange, fallback: '', disabled, readOnly, report });
  // Uncontrolled fields stay native-uncontrolled so a form reset restores defaultValue (R14).
  const [controlled] = useState(value !== undefined);
  const valueProps = controlled ? { value: current } : { defaultValue: defaultValue ?? '' };
  if (!control.ok) return <FieldControlError code={control.code} component="Input" />;
  return control.wrap(
    <input
      {...native}
      ref={ref}
      id={control.id}
      type={type}
      className={cx('nova-input', className)}
      {...valueProps}
      {...editHandlers(setValue, native.onInput)}
      disabled={disabled}
      readOnly={readOnly}
      required={control.required || undefined}
      aria-label={control.ariaLabel}
      aria-labelledby={control.ariaLabelledby}
      aria-describedby={control.ariaDescribedby}
      aria-invalid={control.invalid || undefined}
    />,
  );
}

export function Textarea(props: TextareaProps) {
  const { value, defaultValue, onValueChange, disabled, readOnly, className, ref } = props;
  const { rows = 3, resize = 'vertical', ...native } = nativeProps(props);
  const control = useFieldControl(props, { component: 'Textarea' });
  const report = useDiagnostics('Textarea');
  const [current, setValue] = useControllableValue<string>({ value, defaultValue, onValueChange, fallback: '', disabled, readOnly, report });
  // Uncontrolled fields stay native-uncontrolled so a form reset restores defaultValue (R14).
  const [controlled] = useState(value !== undefined);
  const valueProps = controlled ? { value: current } : { defaultValue: defaultValue ?? '' };
  if (!control.ok) return <FieldControlError code={control.code} component="Textarea" />;
  return control.wrap(
    <textarea
      {...native}
      ref={ref}
      id={control.id}
      rows={rows}
      className={cx('nova-input', 'nova-textarea', `nova-textarea--resize-${resize}`, className)}
      {...valueProps}
      {...editHandlers(setValue, native.onInput)}
      disabled={disabled}
      readOnly={readOnly}
      required={control.required || undefined}
      aria-label={control.ariaLabel}
      aria-labelledby={control.ariaLabelledby}
      aria-describedby={control.ariaDescribedby}
      aria-invalid={control.invalid || undefined}
    />,
  );
}
