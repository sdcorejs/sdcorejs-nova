import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Field, focusFirstInvalid } from '../field/index.js';
import { Switch } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Switch (F05)', () => {
  it('is a switch toggled once per activation', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Switch label="Thông báo" onValueChange={onValueChange} />);
    const control = screen.getByRole('switch', { name: 'Thông báo' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    await user.click(control);
    expect(onValueChange.mock.calls).toEqual([[true]]);
    expect(control.getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByText('Thông báo'));
    expect(onValueChange.mock.calls).toEqual([[true], [false]]);
  });

  it('controlled false does not change DOM until prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Switch aria-label="x" value={false} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });

  it('disabled Space/click do not emit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Switch aria-label="x" disabled onValueChange={onValueChange} />);
    await user.click(screen.getByRole('switch'));
    screen.getByRole('switch').focus();
    await user.keyboard(' ');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('readOnly Space/click/label click do not emit, stays focusable', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Switch label="S" readOnly onValueChange={onValueChange} />);
    const control = screen.getByRole('switch');
    await user.click(control);
    expect(document.activeElement).toBe(control);
    await user.keyboard(' ');
    await user.click(screen.getByText('S'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(control.getAttribute('aria-readonly')).toBe('true');
  });

  it('checked submits name=submissionValue; off submits nothing', () => {
    const { container } = render(
      <form>
        <Switch aria-label="a" name="a" defaultValue />
        <Switch aria-label="b" name="b" defaultValue submissionValue="1" />
        <Switch aria-label="c" name="c" />
      </form>,
    );
    expect([...new FormData(container.querySelector('form')!).entries()]).toEqual([['a', 'on'], ['b', '1']]);
  });

  it('ref on visible control, inputRef + native props on hidden input; nameFromField in Field', () => {
    const ref = createRef<HTMLElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(
      <form data-testid="form">
        <Field label="Bật" required><Switch nameFromField name="on" form="other" autoComplete="off" ref={ref} inputRef={inputRef} /></Field>
      </form>,
    );
    const control = screen.getByRole('switch', { name: 'Bật' });
    expect(ref.current).toBe(control);
    expect(inputRef.current?.name).toBe('on');
    expect(inputRef.current?.getAttribute('form')).toBe('other');
    expect(inputRef.current?.getAttribute('autocomplete')).toBe('off');
    expect(inputRef.current?.required).toBe(true);
  });

  it('focusFirstInvalid targets the visible switch', () => {
    render(<form data-testid="form"><Switch label="Bắt buộc" name="r" required /></form>);
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('switch'));
  });
});

// native reset and hidden inputRef lifecycle.
import { act } from '@testing-library/react';

describe('Switch native form reset and inputRef lifecycle', () => {
  it('uncontrolled on → off → reset restores visible, hidden and FormData', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><Switch label="S" name="s" defaultValue /></form>);
    const form = container.querySelector('form')!;
    await user.click(screen.getByRole('switch'));
    await act(async () => {
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(container.querySelector<HTMLInputElement>('input[name="s"]')!.checked).toBe(true);
    expect([...new FormData(form).entries()]).toEqual([['s', 'on']]);
  });

  it('a React 19 callback inputRef gets its cleanup on unmount', () => {
    const events: string[] = [];
    const view = render(<Switch label="S" inputRef={(node) => {
      events.push(node ? 'set' : 'null');
      return () => {
        events.push('cleanup');
      };
    }} />);
    view.unmount();
    expect(events).toEqual(['set', 'cleanup']);
  });
});

// the reset branch follows the frozen mount mode.
describe('Switch reset after a mode switch (round 2 R15)', () => {
  const settleReset = async (form: HTMLFormElement) => {
    await act(async () => {
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  const native = (container: HTMLElement, name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

  it('controlled at mount, value later omitted: reset keeps the last controlled value everywhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container, rerender } = render(<form><Switch label="S" name="x" value onValueChange={() => {}} /></form>);
    rerender(<form><Switch label="S" name="x" onValueChange={() => {}} /></form>);
    await settleReset(container.querySelector('form')!);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(native(container, 'x').checked).toBe(true);
    expect([...new FormData(container.querySelector('form')!).entries()]).toEqual([['x', 'on']]);
  });

  it('uncontrolled at mount, value later provided: reset returns to the mount default everywhere', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    const { container, rerender } = render(<form><Switch label="S" name="y" /></form>);
    await user.click(screen.getByRole('switch'));
    rerender(<form><Switch label="S" name="y" value onValueChange={() => {}} /></form>);
    await settleReset(container.querySelector('form')!);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(native(container, 'y').checked).toBe(false);
    expect([...new FormData(container.querySelector('form')!).entries()]).toEqual([]);
  });
});
