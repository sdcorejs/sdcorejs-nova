import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Field, focusFirstInvalid } from '../field/index.js';
import { RadioGroup } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mixed = [{ value: 1, label: 'Một (số)' }, { value: '1', label: 'Một (chuỗi)' }, { value: 0, label: 'Không' }] as const;
const formEntries = (container: HTMLElement) => [...new FormData(container.querySelector('form')!).entries()];

describe('selection by === (F06-AC02, INV-015)', () => {
  it("value 1 selects the numeric option, not '1'", () => {
    render(<RadioGroup<1 | '1' | 0> label="Chọn" options={mixed} value={1} onValueChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Một (số)' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Một (chuỗi)' }).getAttribute('aria-checked')).toBe('false');
  });

  it('key 0 is selectable and emitted as the number 0', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadioGroup<1 | '1' | 0> label="Chọn" options={mixed} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('radio', { name: 'Không' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toBe(0);
    expect(screen.getByRole('radio', { name: 'Không' }).getAttribute('aria-checked')).toBe('true');
  });

  it("default FormData n:1 and s:1", () => {
    const { container } = render(
      <form>
        <RadioGroup<1 | '1' | 0> label="A" name="a" options={mixed} defaultValue={1} />
        <RadioGroup<1 | '1' | 0> label="B" name="b" options={mixed} defaultValue="1" />
        <RadioGroup<1 | '1' | 0> label="C" name="c" options={mixed} defaultValue={0} />
      </form>,
    );
    expect(formEntries(container)).toEqual([['a', 'n:1'], ['b', 's:1'], ['c', 'n:0']]);
  });

  it('serializeValue output used in FormData', () => {
    const { container } = render(
      <form>
        <RadioGroup label="Kênh" name="channel" defaultValue="email" serializeValue={(key) => key.toUpperCase()}
          options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} />
      </form>,
    );
    expect(formEntries(container)).toEqual([['channel', 'EMAIL']]);
  });

  it('native form/autoComplete reach every radio input', () => {
    const { container } = render(
      <>
        <form id="f" />
        <RadioGroup label="K" name="k" form="f" autoComplete="off" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />
      </>,
    );
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input.getAttribute('form')).toBe('f');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(input.name).toBe('k');
    }
  });
});

describe('configuration errors (D-019, INV-015)', () => {
  it('duplicate serialized values render configuration error and no radios', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <NovaProvider locale="en">
        <RadioGroup label="D" options={[{ value: 'A', label: 'a' }, { value: 'a', label: 'b' }]} serializeValue={(key) => key.toLowerCase()} />
      </NovaProvider>,
    );
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText(en.forms.configurationError)).toBeTruthy();
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_RADIO_DUPLICATE_KEY'))).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('non-finite key %s renders configuration error', (key) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<RadioGroup label="N" options={[{ value: 1, label: 'one' }, { value: key, label: 'bad' }]} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_RADIO_NONFINITE_KEY'))).toBe(true);
  });

  it('unknown value selects nothing with diagnostic and no onValueChange during render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onValueChange = vi.fn();
    render(<RadioGroup label="U" value="missing" onValueChange={onValueChange} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
    for (const radio of screen.getAllByRole('radio')) expect(radio.getAttribute('aria-checked')).toBe('false');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_RADIO_UNKNOWN_VALUE'))).toBe(true);
  });

  it('empty options show localized explanation without radios', () => {
    render(<NovaProvider locale="en"><RadioGroup label="E" options={[]} /></NovaProvider>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText(en.forms.radioEmpty)).toBeTruthy();
  });

  it('nameFromField outside a Field renders configuration error', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<RadioGroup nameFromField options={[{ value: 'a', label: 'A' }]} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});

describe('keyboard (F06-AC01)', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B', disabled: true },
    { value: 'c', label: 'C' },
  ];

  it('arrows move and emit once, disabled skipped', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadioGroup label="K" options={options} defaultValue="a" onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onValueChange.mock.calls).toEqual([['c']]);
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
    expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('true');
  });

  it('RTL reverses Left/Right', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <NovaProvider dir="rtl">
        <RadioGroup label="K" orientation="horizontal" options={[{ value: 'a', label: 'A' }, { value: 'c', label: 'C' }]} defaultValue="a" onValueChange={onValueChange} />
      </NovaProvider>,
    );
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(onValueChange.mock.calls).toEqual([['c']]);
  });

  it('Tab enters on checked or first enabled and leaves the group', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <RadioGroup label="K" options={options} defaultValue="c" />
        <button type="button">after</button>
        <RadioGroup label="K2" options={[{ value: 'x', label: 'X', disabled: true }, { value: 'y', label: 'Y' }]} />
      </>,
    );
    screen.getByRole('button', { name: 'before' }).focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Y' }));
  });

  it('readOnly Space/arrows/label click do not change selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadioGroup label="R" readOnly options={options} defaultValue="a" onValueChange={onValueChange} />);
    const first = screen.getByRole('radio', { name: 'A' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    await user.click(screen.getByText('C'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(first.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('false');
  });
});

describe('form validation and naming (F06-AC03)', () => {
  it('required with null invalidates form and FormData lacks name', () => {
    const { container } = render(<form><RadioGroup label="Q" name="q" required options={[{ value: 'a', label: 'A' }]} value={null} onValueChange={() => {}} /></form>);
    const form = container.querySelector('form')!;
    expect(form.checkValidity()).toBe(false);
    expect(formEntries(container)).toEqual([]);
    expect(screen.getByRole('radiogroup').getAttribute('aria-required')).toBe('true');
  });

  it('nameFromField uses Field label id, merged describedby, aria-required; Field label click selects nothing', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Field label="Kênh nhận tin" description="Chọn một" error="Bắt buộc" required>
        <RadioGroup nameFromField options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} onValueChange={onValueChange} aria-describedby="extra" />
      </Field>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Kênh nhận tin' });
    expect(group.getAttribute('aria-describedby')?.split(' ')).toHaveLength(3);
    expect(group.getAttribute('aria-required')).toBe('true');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    await user.click(screen.getByText('Kênh nhận tin'));
    expect(onValueChange).not.toHaveBeenCalled();
    for (const radio of screen.getAllByRole('radio')) expect(radio.getAttribute('aria-checked')).toBe('false');
  });

  it('option ids unique across two groups', () => {
    const { container } = render(
      <>
        <RadioGroup label="A" options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} />
        <RadioGroup label="B" options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('focusFirstInvalid lands on the checked or first enabled radio', () => {
    render(
      <form data-testid="form">
        <RadioGroup label="F" name="f" required options={[{ value: 'a', label: 'A', disabled: true }, { value: 'b', label: 'B' }]} />
      </form>,
    );
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('radio', { name: 'B' }));
  });

  it('controlled group only changes when the prop changes', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<string | null>(null);
      return <RadioGroup label="C" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value={value} onValueChange={setValue} />;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-checked')).toBe('true');
  });
});

// native reset alignment and option names.
import { act } from '@testing-library/react';

const resetAndSettle = async (form: HTMLFormElement) => {
  await act(async () => {
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
const state = (container: HTMLElement) => ({
  aria: screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-checked') === 'true'),
  native: [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((input) => input.checked),
  data: [...new FormData(container.querySelector('form')!).entries()],
});

describe('RadioGroup native form reset', () => {
  it('uncontrolled: n:1 → select s:1 → reset returns to the numeric default everywhere', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} defaultValue={1} onValueChange={onValueChange} /></form>);
    await user.click(screen.getByRole('radio', { name: 'Một (chuỗi)' }));
    expect(state(container).data).toEqual([['k', 's:1']]);
    await resetAndSettle(container.querySelector('form')!);
    expect(state(container)).toEqual({ aria: [true, false, false], native: [true, false, false], data: [['k', 'n:1']] });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('uncontrolled without default: reset clears the selection and FormData', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><RadioGroup label="K" name="k" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} /></form>);
    await user.click(screen.getByRole('radio', { name: 'B' }));
    await resetAndSettle(container.querySelector('form')!);
    expect(state(container)).toEqual({ aria: [false, false], native: [false, false], data: [] });
  });

  it('controlled: after a prop update the reset keeps native, visible and FormData on the prop', async () => {
    const view = render(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} value={1} onValueChange={() => {}} /></form>);
    view.rerender(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} value="1" onValueChange={() => {}} /></form>);
    await resetAndSettle(view.container.querySelector('form')!);
    expect(state(view.container)).toEqual({ aria: [false, true, false], native: [false, true, false], data: [['k', 's:1']] });
  });

  it('a cancelled reset changes nothing', async () => {
    const user = userEvent.setup();
    const { container } = render(<form onReset={(event) => event.preventDefault()}><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} defaultValue={1} /></form>);
    await user.click(screen.getByRole('radio', { name: 'Không' }));
    await resetAndSettle(container.querySelector('form')!);
    expect(state(container).data).toEqual([['k', 'n:0']]);
  });
});

describe('RadioGroup option names', () => {
  it.each([[''], [null], ['   '], [<span key="s" />], [<></>]])('option label %j renders the localized configuration error and no radios', (label) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NovaProvider locale="en"><RadioGroup label="G" options={[{ value: 'ok', label: 'OK' }, { value: 'a', label }]} /></NovaProvider>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText(en.forms.configurationError)).toBeTruthy();
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_ACCESSIBLE_NAME_EMPTY'))).toBe(true);
  });

  it('keeps 0 and meaningful nodes as option names', () => {
    render(<RadioGroup label="G" options={[{ value: 0, label: 0 }, { value: 1, label: <strong>Một</strong> }]} />);
    expect(screen.getByRole('radio', { name: '0' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Một' })).toBeTruthy();
  });
});

// the reset branch follows the frozen mount mode.
describe('RadioGroup reset after a mode switch (round 2)', () => {
  it("controlled n:1 → s:1 → value omitted: reset keeps s:1 on visible, native and FormData", async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = render(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} value={1} onValueChange={() => {}} /></form>);
    view.rerender(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} value="1" onValueChange={() => {}} /></form>);
    view.rerender(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} onValueChange={() => {}} /></form>);
    await resetAndSettle(view.container.querySelector('form')!);
    expect(state(view.container)).toEqual({ aria: [false, true, false], native: [false, true, false], data: [['k', 's:1']] });
  });

  it('uncontrolled default n:1 → select n:0 → value provided: reset returns to n:1 everywhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    const view = render(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} defaultValue={1} /></form>);
    await user.click(screen.getByRole('radio', { name: 'Không' }));
    view.rerender(<form><RadioGroup<1 | '1' | 0> label="K" name="k" options={mixed} value="1" onValueChange={() => {}} /></form>);
    await resetAndSettle(view.container.querySelector('form')!);
    expect(state(view.container)).toEqual({ aria: [true, false, false], native: [true, false, false], data: [['k', 'n:1']] });
  });
});
