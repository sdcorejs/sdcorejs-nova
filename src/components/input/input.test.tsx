import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IconButton } from '../button/index.js';
import { Field } from '../field/index.js';
import { Input, InputGroup, Textarea } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const COMBINING_CIRCUMFLEX = String.fromCodePoint(0x0302);

function Controlled({ initial = '', onValue }: { initial?: string; onValue?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Input aria-label="controlled" value={value} onValueChange={(next) => { onValue?.(next); setValue(next); }} />
      <button type="button" onClick={() => setValue('')}>reset</button>
    </>
  );
}

describe('Input value (F02-AC01, F02-AC02)', () => {
  it('emits native value per input event without trim or normalization', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input aria-label="x" onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox'), ' a ');
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([' ', ' a', ' a ']);
    expect(screen.getByRole('textbox')).toHaveProperty('value', ' a ');
  });

  it('composition events are not buffered or normalized', () => {
    const onValueChange = vi.fn();
    render(<Input aria-label="x" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'Vie' } });
    fireEvent.change(input, { target: { value: `Vie${COMBINING_CIRCUMFLEX}` } });
    fireEvent.compositionEnd(input);
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['Vie', `Vie${COMBINING_CIRCUMFLEX}`]);
    expect(onValueChange.mock.calls[1]?.[0]).not.toBe(`Vie${COMBINING_CIRCUMFLEX}`.normalize('NFC'));
  });

  it('controlled update preserves caret', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="abcd" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'controlled' });
    await user.type(input, 'X', { initialSelectionStart: 2, initialSelectionEnd: 2 });
    expect(input.value).toBe('abXcd');
    expect(input.selectionStart).toBe(3);
  });

  it('controlled input does not change until the prop changes', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input aria-label="x" value="fixed" onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox'), 'z');
    expect(onValueChange).toHaveBeenCalledWith('fixedz');
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'fixed');
  });

  it('reset to empty string', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="abc" />);
    await user.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByRole('textbox')).toHaveProperty('value', '');
  });

  it('empty string defaultValue is a legitimate value', () => {
    render(<Input aria-label="x" defaultValue="" />);
    expect(screen.getByRole('textbox')).toHaveProperty('value', '');
  });
});

describe('Input boundaries (F02-AC03)', () => {
  it('maxLength exact boundary and paste', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input aria-label="x" maxLength={5} onValueChange={onValueChange} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.maxLength).toBe(5);
    await user.type(input, 'abcdef');
    expect(input.value).toBe('abcde');
    await user.clear(input);
    await user.click(input);
    await user.paste('123456789');
    expect(input.value).toBe('12345');
    expect(onValueChange).toHaveBeenLastCalledWith('12345');
  });

  it('disabled does not emit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input aria-label="x" disabled onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox'), 'a');
    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('readOnly does not emit but stays focusable', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Input aria-label="x" readOnly defaultValue="copy me" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(document.activeElement).toBe(input);
    await user.keyboard('a');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveProperty('value', 'copy me');
  });
});

describe('native props and refs', () => {
  it('native name/form/required/autoComplete reach the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <form id="f" />
        <Field label="Email" required>
          <Input nameFromField ref={ref} name="email" form="f" autoComplete="email" type="email" inputMode="email" placeholder="a@b.c" />
        </Field>
      </>,
    );
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Email' });
    expect(ref.current).toBe(input);
    expect(input.name).toBe('email');
    expect(input.getAttribute('form')).toBe('f');
    expect(input.required).toBe(true);
    expect(input.getAttribute('autocomplete')).toBe('email');
    expect(input.type).toBe('email');
    expect(input.getAttribute('inputmode')).toBe('email');
    expect(input.placeholder).toBe('a@b.c');
  });

  it('standalone label with description and error', () => {
    render(<Input label="Tên" description="Họ tên" error="Bắt buộc" required />);
    const input = screen.getByRole('textbox', { name: 'Tên' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(input).toHaveProperty('required', true);
  });

  it('password toggle composition switches type, keeps value and focus, aria-pressed reflects state', async () => {
    const user = userEvent.setup();
    function Password() {
      const [shown, setShown] = useState(false);
      return (
        <Field label="Mật khẩu">
          <InputGroup end={<IconButton label="Hiện mật khẩu" aria-pressed={shown} variant="ghost" icon={<svg />} onClick={() => setShown(!shown)} />}>
            <Input nameFromField type={shown ? 'text' : 'password'} defaultValue="s3cret" autoComplete="current-password" />
          </InputGroup>
        </Field>
      );
    }
    render(<Password />);
    const input = screen.getByLabelText<HTMLInputElement>('Mật khẩu');
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(input.type).toBe('text');
    expect(input.value).toBe('s3cret');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByLabelText('Mật khẩu')).toBe(input);
  });
});

describe('Textarea', () => {
  it('Textarea rows defaults to 3 and emits raw values', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea aria-label="Ghi chú" ref={ref} onValueChange={onValueChange} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Ghi chú' });
    expect(textarea.rows).toBe(3);
    expect(ref.current).toBe(textarea);
    await user.type(textarea, 'a{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('a\n');
  });

  it('rows and resize are configurable', () => {
    render(<Textarea aria-label="t" rows={6} resize="none" />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox');
    expect(textarea.rows).toBe(6);
    expect(textarea.className).toContain('nova-textarea--resize-none');
  });
});

describe('InputGroup (server-compatible layout)', () => {
  it('renders start and end around the control', () => {
    render(<InputGroup start={<span>₫</span>} end={<span>VND</span>}><Input aria-label="Giá" /></InputGroup>);
    const group = screen.getByRole('textbox').parentElement!;
    expect(group.textContent).toBe('₫VND');
    expect(group.firstElementChild?.textContent).toBe('₫');
    expect(group.lastElementChild?.textContent).toBe('VND');
  });
});

// native form reset for uncontrolled fields.
describe('native form reset', () => {
  it('a reset button restores the uncontrolled Input and Textarea defaults', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Input aria-label="name" defaultValue="initial" />
        <Textarea aria-label="notes" defaultValue="initial" />
        <button type="reset">Reset</button>
      </form>,
    );
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'name' });
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'notes' });
    await user.type(input, ' edited');
    await user.type(textarea, ' edited');
    expect(input.value).toBe('initial edited');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input.value).toBe('initial');
    expect(textarea.value).toBe('initial');
  });

  it('form.reset() restores defaults (empty when none) and later edits emit from the reset value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <form>
        <Input aria-label="a" defaultValue="abc" onValueChange={onValueChange} />
        <Input aria-label="b" />
      </form>,
    );
    const a = screen.getByRole<HTMLInputElement>('textbox', { name: 'a' });
    const b = screen.getByRole<HTMLInputElement>('textbox', { name: 'b' });
    await user.type(a, 'd');
    await user.type(b, 'zz');
    container.querySelector('form')!.reset();
    expect(a.value).toBe('abc');
    expect(b.value).toBe('');
    // user-event keeps its own UI-value tracking that a native reset bypasses in jsdom,
    // so the next edit is dispatched as a native change from the reset DOM value.
    fireEvent.change(a, { target: { value: `${a.value}x` } });
    expect(onValueChange).toHaveBeenLastCalledWith('abcx');
  });

  it('an externally associated form (form="id") resets the field too', async () => {
    const user = userEvent.setup();
    render(
      <>
        <form id="outer"><button type="reset">Reset</button></form>
        <Input aria-label="ext" form="outer" defaultValue="keep" />
      </>,
    );
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'ext' });
    await user.type(input, '!');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input.value).toBe('keep');
  });

  it('a controlled Input keeps its prop value after a reset (consumer owns it)', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><Input aria-label="c" value="owned" onValueChange={() => {}} /></form>);
    await user.click(screen.getByRole('textbox'));
    container.querySelector('form')!.reset();
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'owned');
  });
});

// the native input-event path must keep
// the native-props contract and emit exactly once per edit.
describe('native input event path (round 2 R14)', () => {
  it.each(['input', 'textarea'] as const)('%s: a consumer onInput still runs and each keystroke emits once', async (kind) => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    const onValueChange = vi.fn();
    if (kind === 'input') render(<Input label="A" onInput={onInput} onValueChange={onValueChange} />);
    else render(<Textarea label="A" onInput={onInput} onValueChange={onValueChange} />);
    await user.type(screen.getByRole('textbox'), 'xy');
    expect(onInput).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls).toEqual([['x'], ['xy']]);
  });

  it('a bare change event (no input event) still emits once', () => {
    const onValueChange = vi.fn();
    render(<Input label="A" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'z' } });
    expect(onValueChange.mock.calls).toEqual([['z']]);
  });
});
