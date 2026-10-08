import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axe from 'axe-core';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Field, focusFirstInvalid } from '../field/index.js';
import { Checkbox } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const hiddenInput = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)!;

describe('Checkbox state (F05-AC01)', () => {
  it('mixed activates to true once', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Checkbox label="Tất cả" value="mixed" onValueChange={onValueChange} />);
    const box = screen.getByRole('checkbox', { name: 'Tất cả' });
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    await user.click(box);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('uncontrolled mixed default becomes checked after one activation', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Tất cả" defaultValue="mixed" />);
    const box = screen.getByRole('checkbox');
    await user.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
    await user.click(box);
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('controlled false does not change DOM until prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const view = render(<Checkbox label="A" value={false} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('false');
    view.rerender(<Checkbox label="A" value onValueChange={onValueChange} />);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('standalone label click toggles exactly once', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Checkbox label="Đồng ý" onValueChange={onValueChange} />);
    await user.click(screen.getByText('Đồng ý'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('Space toggles once', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Checkbox aria-label="x" onValueChange={onValueChange} />);
    screen.getByRole('checkbox').focus();
    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});

describe('disabled and readOnly (F05-AC02)', () => {
  it('disabled Space/click do not emit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Checkbox label="A" disabled onValueChange={onValueChange} />);
    const box = screen.getByRole('checkbox');
    await user.click(box);
    box.focus();
    await user.keyboard(' ');
    await user.click(screen.getByText('A'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(box.getAttribute('aria-disabled')).toBe('true');
  });

  it('readOnly Space/click/label click do not emit, stays focusable', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Checkbox label="A" readOnly defaultValue onValueChange={onValueChange} />);
    const box = screen.getByRole('checkbox');
    await user.click(box);
    expect(document.activeElement).toBe(box);
    await user.keyboard(' ');
    await user.click(screen.getByText('A'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(box.getAttribute('aria-readonly')).toBe('true');
  });
});

describe('form participation (INV-015)', () => {
  it("checked submits name=submissionValue (default 'on'); false and mixed submit nothing", () => {
    const { container } = render(
      <form>
        <Checkbox aria-label="a" name="a" defaultValue />
        <Checkbox aria-label="b" name="b" defaultValue submissionValue="yes" />
        <Checkbox aria-label="c" name="c" defaultValue={false} />
        <Checkbox aria-label="d" name="d" defaultValue="mixed" />
      </form>,
    );
    expect([...new FormData(container.querySelector('form')!).entries()]).toEqual([['a', 'on'], ['b', 'yes']]);
  });

  it('name/form/required/autoComplete on hidden input; ref on visible control; inputRef on hidden input', () => {
    const ref = createRef<HTMLElement>();
    const inputRef = createRef<HTMLInputElement>();
    const { container } = render(
      <>
        <form id="f" />
        <Checkbox label="A" name="agree" form="f" required autoComplete="off" ref={ref} inputRef={inputRef} />
      </>,
    );
    const input = hiddenInput(container, 'agree');
    expect(inputRef.current).toBe(input);
    expect(ref.current).toBe(screen.getByRole('checkbox'));
    expect(input.getAttribute('form')).toBe('f');
    expect(input.required).toBe(true);
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(screen.getByRole('checkbox').getAttribute('autocomplete')).toBeNull();
  });

  it('required unchecked invalidates form', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><Checkbox label="A" name="a" required /></form>);
    const form = container.querySelector('form')!;
    expect(form.checkValidity()).toBe(false);
    await user.click(screen.getByRole('checkbox'));
    expect(form.checkValidity()).toBe(true);
  });

  it('focusFirstInvalid targets the visible control', () => {
    const { container } = render(<form><Checkbox label="A" name="a" required /></form>);
    const target = focusFirstInvalid(container.querySelector('form')!);
    expect(target).toBe(screen.getByRole('checkbox'));
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
  });
});

describe('naming (F05-AC03, INV-009)', () => {
  it('nameFromField uses the Field label; Field label click toggles once; describedby merged', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Nhận bản tin" description="Mỗi tuần" error="Cần đồng ý" required><Checkbox nameFromField onValueChange={onValueChange} /></Field>);
    const box = screen.getByRole('checkbox', { name: 'Nhận bản tin' });
    expect(box.getAttribute('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(box.getAttribute('aria-invalid')).toBe('true');
    await user.click(screen.getByText('Nhận bản tin'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('nameFromField outside Field renders configuration error and no checkbox', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NovaProvider locale="en"><Checkbox nameFromField /></NovaProvider>);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText(en.forms.configurationError)).toBeTruthy();
  });

  it('empty aria-label renders configuration error', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Checkbox aria-label="" />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('a native fieldset/legend groups several checkboxes, each with its own name', () => {
    render(
      <fieldset>
        <legend>Kênh</legend>
        <Checkbox label="Email" name="email" />
        <Checkbox label="SMS" name="sms" />
      </fieldset>,
    );
    expect(screen.getByRole('group', { name: 'Kênh' })).toBeTruthy();
    expect(screen.getAllByRole('checkbox').map((box) => box.getAttribute('aria-labelledby') !== null)).toEqual([true, true]);
    expect(screen.getByRole('checkbox', { name: 'SMS' })).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <NovaProvider><Checkbox label="A" defaultValue="mixed" /><Field label="B"><Checkbox nameFromField /></Field></NovaProvider>,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });

  it('controlled usage from the dossier example narrows mixed explicitly', async () => {
    const user = userEvent.setup();
    function Example() {
      const [accepted, setAccepted] = useState(false);
      return <Checkbox label="Chấp nhận điều khoản" value={accepted} onValueChange={(next) => setAccepted(next === true)} />;
    }
    render(<Example />);
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });
});

// native reset and hidden inputRef lifecycle.
import { act } from '@testing-library/react';

const afterReset = async (run: () => void) => {
  await act(async () => {
    run();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
const entries = (form: HTMLFormElement) => [...new FormData(form).entries()];

describe('Checkbox native form reset', () => {
  it('uncontrolled true → off → reset restores visible, hidden and FormData without emitting', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<form><Checkbox label="A" name="x" defaultValue onValueChange={onValueChange} /></form>);
    const form = container.querySelector('form')!;
    await user.click(screen.getByRole('checkbox'));
    expect(entries(form)).toEqual([]);
    await afterReset(() => form.reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    expect(hiddenInput(container, 'x').checked).toBe(true);
    expect(entries(form)).toEqual([['x', 'on']]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('uncontrolled mixed → on → reset (reset button) returns to mixed and submits nothing', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><Checkbox label="A" name="m" defaultValue="mixed" /><button type="reset">Reset</button></form>);
    await user.click(screen.getByRole('checkbox'));
    expect(entries(container.querySelector('form')!)).toEqual([['m', 'on']]);
    await afterReset(() => screen.getByRole('button', { name: 'Reset' }).click());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('mixed');
    expect(hiddenInput(container, 'm').checked).toBe(false);
    expect(entries(container.querySelector('form')!)).toEqual([]);
  });

  it('an externally associated form resets the checkbox', async () => {
    const user = userEvent.setup();
    const { container } = render(<><form id="ext" /><Checkbox label="A" name="e" form="ext" /></>);
    await user.click(screen.getByRole('checkbox'));
    await afterReset(() => (container.querySelector('form#ext') as HTMLFormElement).reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('false');
    expect(hiddenInput(container, 'e').checked).toBe(false);
  });

  it('a cancelled reset changes nothing', async () => {
    const user = userEvent.setup();
    const { container } = render(<form onReset={(event) => event.preventDefault()}><Checkbox label="A" name="c" /></form>);
    await user.click(screen.getByRole('checkbox'));
    await afterReset(() => container.querySelector('form')!.reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    expect(hiddenInput(container, 'c').checked).toBe(true);
  });

  it('controlled: reset keeps the consumer value on the visible and the native control', async () => {
    const { container, rerender } = render(<form><Checkbox label="A" name="k" value={false} onValueChange={() => {}} /></form>);
    rerender(<form><Checkbox label="A" name="k" value onValueChange={() => {}} /></form>);
    await afterReset(() => container.querySelector('form')!.reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    expect(hiddenInput(container, 'k').checked).toBe(true);
    expect(entries(container.querySelector('form')!)).toEqual([['k', 'on']]);
  });
});

describe('Checkbox hidden inputRef lifecycle', () => {
  it('a React 19 callback inputRef gets its cleanup; plain callbacks get null; object refs are cleared', () => {
    const events: string[] = [];
    const objectRef = createRef<HTMLInputElement>();
    const plain: (HTMLInputElement | null)[] = [];
    const view = render(
      <>
        <Checkbox label="A" name="a" inputRef={(node) => {
          events.push(node ? 'set' : 'null');
          return () => {
            events.push('cleanup');
          };
        }} />
        <Checkbox label="B" name="b" inputRef={(node) => { plain.push(node); }} />
        <Checkbox label="C" name="c" inputRef={objectRef} />
      </>,
    );
    expect(events).toEqual(['set']);
    expect(plain[0]).toBeInstanceOf(HTMLInputElement);
    expect(objectRef.current).toBeInstanceOf(HTMLInputElement);
    view.unmount();
    expect(events).toEqual(['set', 'cleanup']);
    expect(plain.at(-1)).toBeNull();
    expect(objectRef.current).toBeNull();
  });
});

// the reset branch follows the frozen
// mount mode, not the current presence of `value` (a mode switch keeps the mount mode).
describe('Checkbox reset after a mode switch (round 2 R15)', () => {
  it('controlled at mount, value later omitted: reset keeps the last controlled value everywhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container, rerender } = render(<form><Checkbox label="A" name="x" value onValueChange={() => {}} /></form>);
    rerender(<form><Checkbox label="A" name="x" onValueChange={() => {}} /></form>);
    await afterReset(() => container.querySelector('form')!.reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    expect(hiddenInput(container, 'x').checked).toBe(true);
    expect(entries(container.querySelector('form')!)).toEqual([['x', 'on']]);
  });

  it('uncontrolled at mount, value later provided: reset returns to the mount default everywhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    const { container, rerender } = render(<form><Checkbox label="A" name="y" /></form>);
    await user.click(screen.getByRole('checkbox'));
    rerender(<form><Checkbox label="A" name="y" value onValueChange={() => {}} /></form>);
    await afterReset(() => container.querySelector('form')!.reset());
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('false');
    expect(hiddenInput(container, 'y').checked).toBe(false);
    expect(entries(container.querySelector('form')!)).toEqual([]);
  });
});
