import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useControllableValue, type ControllableOptions } from './use-controllable-value.js';

type Props = ControllableOptions<string | null>;

function setup(initial: Props) {
  return renderHook((props: Props) => useControllableValue(props), { initialProps: initial });
}

describe('useControllableValue (INV-008)', () => {
  it('controlled null stays null until the prop changes; callback is a proposal', () => {
    const onValueChange = vi.fn();
    const hook = setup({ value: null, onValueChange, fallback: '' });
    expect(hook.result.current[0]).toBeNull();
    act(() => hook.result.current[1]('a'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(hook.result.current[0]).toBeNull();
    hook.rerender({ value: 'a', onValueChange, fallback: '' });
    expect(hook.result.current[0]).toBe('a');
  });

  it('uncontrolled reads defaultValue only at mount', () => {
    const onValueChange = vi.fn();
    const hook = setup({ defaultValue: 'first', onValueChange, fallback: '' });
    expect(hook.result.current[0]).toBe('first');
    hook.rerender({ defaultValue: 'second', onValueChange, fallback: '' });
    expect(hook.result.current[0]).toBe('first');
    act(() => hook.result.current[1]('typed'));
    expect(hook.result.current[0]).toBe('typed');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('uncontrolled without defaultValue starts at the fallback', () => {
    const hook = setup({ fallback: '' });
    expect(hook.result.current[0]).toBe('');
  });

  it('switching mode reports a diagnostic once and keeps the mount mode', () => {
    const report = vi.fn();
    const hook = setup({ defaultValue: 'x', fallback: '', report });
    hook.rerender({ value: 'controlled', fallback: '', report });
    expect(hook.result.current[0]).toBe('x');
    hook.rerender({ value: 'again', fallback: '', report });
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('NOVA_CONTROLLED_MODE_CHANGE');

    const report2 = vi.fn();
    const controlled = setup({ value: 'c', onValueChange: () => {}, fallback: '', report: report2 });
    controlled.rerender({ fallback: '', report: report2 });
    expect(controlled.result.current[0]).toBe('c');
    expect(report2).toHaveBeenCalledWith('NOVA_CONTROLLED_MODE_CHANGE');
  });

  it('disabled and readOnly never emit or change', () => {
    const onValueChange = vi.fn();
    const disabled = setup({ defaultValue: 'd', onValueChange, fallback: '', disabled: true });
    act(() => disabled.result.current[1]('x'));
    expect(disabled.result.current[0]).toBe('d');
    const readOnly = setup({ defaultValue: 'r', onValueChange, fallback: '', readOnly: true });
    act(() => readOnly.result.current[1]('x'));
    expect(readOnly.result.current[0]).toBe('r');
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

// native reset without emitting.
import { useFormReset } from './use-controllable-value.js';

describe('resetValue and useFormReset', () => {
  it('resetValue restores an uncontrolled value without emitting; controlled is untouched', () => {
    const onValueChange = vi.fn();
    const hook = renderHook(() => useControllableValue<string | null>({ defaultValue: 'a', onValueChange, fallback: '' }));
    act(() => hook.result.current[1]('b'));
    act(() => hook.result.current[2]('a'));
    expect(hook.result.current[0]).toBe('a');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    const controlled = renderHook(() => useControllableValue<string | null>({ value: 'c', onValueChange: () => {}, fallback: '' }));
    act(() => controlled.result.current[2]('z'));
    expect(controlled.result.current[0]).toBe('c');
  });

  it('useFormReset runs after the native reset of the associated form, and not when cancelled', async () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.append(input);
    document.body.append(form);
    const onReset = vi.fn(() => input.value);
    renderHook(() => useFormReset(input, onReset));
    input.defaultValue = 'default';
    input.value = 'edited';
    await act(async () => {
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReset.mock.results[0]?.value).toBe('default');
    form.addEventListener('reset', (event) => event.preventDefault());
    await act(async () => {
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    form.remove();
  });
});
