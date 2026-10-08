'use client';
// RadioGroup (F06, §11, INV-015) on Base UI RadioGroup/Radio. State is the typed
// key K matched with ===; the submitted value is the collision-free codec
// (`n:`/`s:`) or `serializeValue`. Non-finite keys or colliding serialized values
// render an accessible configuration error. The Field `controlId` sits on the
// non-labelable radiogroup root, so clicking the Field label selects nothing.
import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { useCallback, useEffect, useId, useState, type ComponentPropsWithRef, type ReactNode, type Ref } from 'react';

import { useDiagnostics, useNovaScope } from '../../providers/nova/context.js';
import { cx } from '../../lib/cx.js';
import { isEmptyLabel } from '../../lib/accessible-name.js';
import { buildRadioKeyMap, findOptionIndex } from '../../lib/radio-key.js';
import { useControllableValue, useFormReset } from '../../lib/use-controllable-value.js';
import type { ControlProps, Key, ValueProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from '../field/field.js';

export type RadioOption<K extends Key> = { value: K; label: ReactNode; disabled?: boolean };

/** After a native reset, checks exactly the radio whose form value is `selected`. */
function syncNativeRadios(form: HTMLFormElement | null | undefined, name: string | undefined, inputs: HTMLInputElement[], selected: string | null): void {
  for (const input of inputs) {
    if (form && input.form !== form) continue;
    if (name !== undefined && input.name !== name) continue;
    input.checked = selected !== null && input.value === selected;
  }
}

export type RadioGroupProps<K extends Key> = ValueProps<K | null> & ControlProps & {
  options: readonly RadioOption<K>[];
  orientation?: 'horizontal' | 'vertical';
  form?: string;
  autoComplete?: ComponentPropsWithRef<'input'>['autoComplete'];
  serializeValue?: (key: K) => string;
  ref?: Ref<HTMLDivElement>;
};

export function RadioGroup<K extends Key>(props: RadioGroupProps<K>) {
  const {
    value, defaultValue, onValueChange, options, orientation = 'vertical', name, form, autoComplete,
    serializeValue, disabled, readOnly, className, style, title, onBlur, onFocus, ref,
  } = props;
  const { strings } = useNovaScope();
  const base = useId();
  const control = useFieldControl(props, { component: 'RadioGroup', labelAs: 'span' });
  const report = useDiagnostics('RadioGroup');
  const [current, setValue, resetValue] = useControllableValue<K | null>({
    value, defaultValue, onValueChange, fallback: null, disabled, readOnly, report,
  });
  const keys = buildRadioKeyMap(options, serializeValue);
  // Every option needs a non-empty name (INV-009, D-019); otherwise the whole group is a configuration error.
  const unnamedOption = options.some((option) => isEmptyLabel(option.label));
  const selectedIndex = findOptionIndex(options, current);
  const unknownValue = current !== null && selectedIndex === -1;

  const keyError = keys.ok ? null : keys.code;
  useEffect(() => {
    if (keyError) report(keyError);
  }, [keyError, report]);
  useEffect(() => {
    if (unknownValue) report('NOVA_RADIO_UNKNOWN_VALUE');
  }, [unknownValue, report]);

  // Hidden radio inputs: autoComplete moves onto them (Base UI keeps it off, A-001)
  // and they are tracked so a native form reset can be observed and re-aligned.
  const [inputs, setInputs] = useState<HTMLInputElement[]>([]);
  const hiddenInputRef = useCallback((node: HTMLInputElement | null) => {
    if (!node) return undefined;
    if (autoComplete) node.setAttribute('autocomplete', autoComplete);
    else node.removeAttribute('autocomplete');
    setInputs((list) => (list.includes(node) ? list : [...list, node]));
    return () => setInputs((list) => list.filter((item) => item !== node));
  }, [autoComplete]);

  // Native form reset (R17): uncontrolled → the mount key without emitting;
  // controlled → the consumer key stays authoritative; native radios follow.
  const [initial] = useState<K | null>(defaultValue ?? null);
  // The mount mode is frozen (useControllableValue keeps it after a mode switch).
  const [controlled] = useState(value !== undefined);
  const serializedKeys = keys.ok ? keys.serialized : [];
  const serializedOf = (key: K | null) => {
    const index = findOptionIndex(options, key);
    return index === -1 ? null : serializedKeys[index] ?? null;
  };
  const firstInput = inputs[0] ?? null;
  const target = serializedOf(controlled ? current : initial);
  useFormReset(firstInput, useCallback(() => {
    if (!controlled) resetValue(initial);
    syncNativeRadios(firstInput?.form, name, inputs, target);
  }, [controlled, resetValue, initial, firstInput, name, inputs, target]));

  const unnamedError = unnamedOption ? 'NOVA_ACCESSIBLE_NAME_EMPTY' as const : null;
  if (!control.ok) return <FieldControlError code={control.code} component="RadioGroup" />;
  if (!keys.ok) return <FieldControlError code={keys.code} component="RadioGroup" />;
  if (unnamedError) return <FieldControlError code={unnamedError} component="RadioGroup" />;
  if (options.length === 0) {
    return control.wrap(<p className="nova-radio-group__empty">{strings.forms.radioEmpty}</p>);
  }

  const serialized = keys.serialized;
  return control.wrap(
    <BaseRadioGroup
      ref={ref}
      id={control.id}
      name={name}
      form={form}
      value={selectedIndex === -1 ? null : serialized[selectedIndex]}
      onValueChange={(next: unknown) => {
        const index = serialized.indexOf(next as string);
        if (index !== -1) setValue(options[index]!.value);
      }}
      disabled={disabled}
      readOnly={readOnly}
      required={control.required}
      aria-label={control.ariaLabel}
      aria-labelledby={control.ariaLabelledby}
      aria-describedby={control.ariaDescribedby}
      aria-invalid={control.invalid || undefined}
      aria-orientation={orientation}
      className={cx('nova-radio-group', `nova-radio-group--${orientation}`, className)}
      style={style}
      title={title}
      onBlur={onBlur}
      onFocus={onFocus}
      data-nova-control-root=""
    >
      {options.map((option, index) => {
        const labelId = `${base}option-${index}`;
        return (
          // The wrapping label makes the whole row clickable; the radio is named by aria-labelledby.
          <label key={serialized[index]} className="nova-radio-option">
            <Radio.Root
              value={serialized[index]}
              disabled={option.disabled}
              inputRef={hiddenInputRef}
              aria-labelledby={labelId}
              className="nova-radio"
              data-nova-focus-target=""
            >
              <Radio.Indicator className="nova-radio__dot" />
            </Radio.Root>
            <span id={labelId} className="nova-radio-option__label">{option.label}</span>
          </label>
        );
      })}
    </BaseRadioGroup>,
  );
}
