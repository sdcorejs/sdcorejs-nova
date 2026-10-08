import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axe from 'axe-core';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { NovaProvider } from '../../providers/nova/index.js';
import type { ControlProps } from '../../types/index.js';
import { FieldControlError, useFieldControl } from './field.js';
import { Field, FormErrors, Label, focusFirstInvalid } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Minimal control built on the internal Field contract (the same hook real controls use). */
function TestInput(props: ControlProps & { id?: string; 'data-testid'?: string }) {
  const control = useFieldControl(props, { component: 'TestInput' });
  if (!control.ok) return <FieldControlError code={control.code} component="TestInput" />;
  return control.wrap(
    <input
      id={control.id}
      data-testid={props['data-testid']}
      aria-label={control.ariaLabel}
      aria-labelledby={control.ariaLabelledby}
      aria-describedby={control.ariaDescribedby}
      aria-invalid={control.invalid || undefined}
      required={control.required}
    />,
  );
}

describe('Field labelling (F01-AC01, INV-009)', () => {
  it('label click focuses the actual input', async () => {
    const user = userEvent.setup();
    render(<Field label="Email"><TestInput nameFromField /></Field>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await user.click(screen.getByText('Email'));
    expect(document.activeElement).toBe(input);
    const label = document.querySelector('label')!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-labelledby')).toBeNull();
  });

  it('aria-describedby merges description, error and consumer ids without duplicates', () => {
    render(
      <>
        <p id="hint">Hint</p>
        <Field label="Email" description="Công việc" error="Sai định dạng">
          <TestInput nameFromField aria-describedby="hint hint" />
        </Field>
      </>,
    );
    const input = screen.getByRole('textbox');
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(document.getElementById(ids[0]!)?.textContent).toBe('Công việc');
    expect(document.getElementById(ids[1]!)?.textContent).toBe('Sai định dạng');
    expect(ids[2]).toBe('hint');
  });

  it('without description or error there is no dangling describedby', () => {
    render(<Field label="Email"><TestInput nameFromField /></Field>);
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBeNull();
  });

  it('required propagates as native required, marker aria-hidden', () => {
    render(<Field label="Email" required><TestInput nameFromField /></Field>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveProperty('required', true);
    const marker = document.querySelector('label [aria-hidden="true"]');
    expect(marker?.textContent).toContain('*');
  });

  it('error sets aria-invalid; no error leaves it unset', () => {
    const view = render(<Field label="Email" error="Sai"><TestInput nameFromField /></Field>);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
    view.rerender(<Field label="Email"><TestInput nameFromField /></Field>);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
  });

  it('uses Field id as the control id', () => {
    render(<Field id="email" label="Email"><TestInput nameFromField /></Field>);
    expect(screen.getByRole('textbox').id).toBe('email');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <NovaProvider><Field label="Email" description="Gợi ý" error="Sai" required><TestInput nameFromField /></Field></NovaProvider>,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('configuration errors (D-019, INV-009)', () => {
  it('nameFromField outside Field renders configuration error and no input', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NovaProvider locale="en"><TestInput nameFromField /></NovaProvider>);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(en.forms.configurationError)).toBeTruthy();
  });

  it.each([[null], [false], ['']])('empty Field label %j renders configuration error', (label) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Field label={label}><TestInput nameFromField /></Field>);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(viCatalog.forms.configurationError)).toBeTruthy();
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_FIELD_EMPTY_LABEL'))).toBe(true);
  });

  it('second nameFromField control becomes configuration error and final ids are unique', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Field label="Email"><TestInput nameFromField data-testid="one" /><TestInput nameFromField data-testid="two" /></Field>);
    expect(screen.getByTestId('one')).toBeTruthy();
    expect(screen.queryByTestId('two')).toBeNull();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByText(viCatalog.forms.configurationError)).toBeTruthy();
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_FIELD_DUPLICATE_CONTROL'))).toBe(true);
  });

  it('standalone label and aria-label controls work outside a Field', () => {
    render(<><TestInput label="Tên" description="Họ và tên" /><TestInput aria-label="Tìm kiếm" /></>);
    const named = screen.getByRole('textbox', { name: 'Tên' });
    expect(document.getElementById(named.getAttribute('aria-describedby')!)?.textContent).toBe('Họ và tên');
    expect(screen.getByRole('textbox', { name: 'Tìm kiếm' })).toBeTruthy();
  });

  it('empty aria-label renders configuration error', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TestInput aria-label="  " />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('focusFirstInvalid (F01-AC03, Q-13)', () => {
  it('focuses first invalid in DOM order and returns it', () => {
    render(
      <form data-testid="form">
        <input aria-label="a" defaultValue="ok" required />
        <input aria-label="b" required />
        <input aria-label="c" aria-invalid="true" />
      </form>,
    );
    const target = focusFirstInvalid(screen.getByTestId('form'));
    expect(target).toBe(screen.getByRole('textbox', { name: 'b' }));
    expect(document.activeElement).toBe(target);
  });

  it('aria-invalid counts even when constraints pass', () => {
    render(<form data-testid="form"><input aria-label="a" /><input aria-label="c" aria-invalid="true" /></form>);
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('textbox', { name: 'c' }));
  });

  it('returns null when none', () => {
    render(<form data-testid="form"><input aria-label="a" defaultValue="x" required /><button type="button">x</button></form>);
    const before = document.activeElement;
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBeNull();
    expect(document.activeElement).toBe(before);
  });

  it('maps a hidden native input to the visible control of its Nova control root', () => {
    render(
      <form data-testid="form">
        <span data-nova-control-root="">
          <span role="checkbox" aria-checked="false" tabIndex={0} aria-label="accept" data-nova-focus-target="" />
          <input type="checkbox" required aria-hidden="true" tabIndex={-1} />
        </span>
      </form>,
    );
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('checkbox'));
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
  });

  it('prefers the checked focus target, skipping disabled ones', () => {
    render(
      <form data-testid="form">
        <div data-nova-control-root="" aria-invalid="true" role="radiogroup" aria-label="g">
          <button type="button" role="radio" aria-checked="false" disabled data-disabled="" data-nova-focus-target="">a</button>
          <button type="button" role="radio" aria-checked="false" data-nova-focus-target="">b</button>
          <button type="button" role="radio" aria-checked="true" data-checked="" data-nova-focus-target="">c</button>
        </div>
      </form>,
    );
    expect(focusFirstInvalid(screen.getByTestId('form'))?.textContent).toBe('c');
  });

  it('editing without submit never moves focus', async () => {
    const user = userEvent.setup();
    const view = render(<><input aria-label="other" /><Field label="Email"><TestInput nameFromField /></Field></>);
    const other = screen.getByRole('textbox', { name: 'other' });
    await user.click(other);
    await user.keyboard('abc');
    view.rerender(<><input aria-label="other" /><Field label="Email" error="Sai"><TestInput nameFromField /></Field></>);
    expect(document.activeElement).toBe(other);
  });
});

describe('FormErrors', () => {
  it('links focus the field; region is polite', async () => {
    const user = userEvent.setup();
    render(
      <NovaProvider locale="en">
        <Field id="email" label="Email" error="Required"><TestInput nameFromField /></Field>
        <FormErrors errors={[{ id: 'e1', message: 'Email is required', fieldId: 'email' }, { id: 'e2', message: 'General error' }]} />
      </NovaProvider>,
    );
    const region = screen.getByRole('region', { name: en.forms.errorsTitle });
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('General error').closest('a')).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Email is required' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Email' }));
  });

  it('empty list renders nothing', () => {
    const { container } = render(<FormErrors errors={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('Label (server-compatible)', () => {
  it('renders a native label with an aria-hidden required marker', () => {
    render(<><Label htmlFor="x" required>Tên</Label><input id="x" /></>);
    expect(screen.getByRole('textbox', { name: 'Tên' })).toBeTruthy();
    expect(document.querySelector('label [aria-hidden="true"]')).not.toBeNull();
  });
});

describe('hydration (F01-AC03)', () => {
  it('two Fields hydrate with unique ids and 0 recoverable errors', () => {
    const tree = (
      <NovaProvider>
        <Field label="A" description="da"><TestInput nameFromField /></Field>
        <Field label="B" error="eb" required><TestInput nameFromField /></Field>
      </NovaProvider>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => { hydrateRoot(container, tree, { onRecoverableError }); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs).toHaveLength(2);
    expect(inputs[0]!.id).not.toBe(inputs[1]!.id);
  });
});

// only usable targets are focused and returned.
describe('focusFirstInvalid skips unusable targets', () => {
  function UnusableFirst() {
    return (
      <form data-testid="form">
        <input aria-label="own-disabled" aria-invalid="true" disabled />
        <fieldset disabled>
          <input aria-label="fieldset-disabled" aria-invalid="true" />
        </fieldset>
        <input type="hidden" name="h" aria-invalid="true" />
        <div aria-invalid="true">not focusable</div>
        <div hidden><input aria-label="in-hidden" aria-invalid="true" /></div>
        <div inert><input aria-label="in-inert" aria-invalid="true" /></div>
        <span data-nova-control-root="">
          <span role="checkbox" aria-checked="false" aria-label="disabled-visible" tabIndex={0} aria-disabled="true" data-disabled="" data-nova-focus-target="" />
          <input type="checkbox" required aria-hidden="true" tabIndex={-1} />
        </span>
        <input aria-label="target" required />
      </form>
    );
  }

  it('continues past unusable invalid elements to the first usable one and really focuses it', () => {
    render(<UnusableFirst />);
    const target = focusFirstInvalid(screen.getByTestId('form'));
    expect(target).toBe(screen.getByRole('textbox', { name: 'target' }));
    expect(document.activeElement).toBe(target);
  });

  it('returns null and leaves focus alone when nothing invalid is usable', () => {
    render(
      <>
        <button type="button">outside</button>
        <form data-testid="form">
          <input aria-label="d" aria-invalid="true" disabled />
          <div aria-invalid="true">x</div>
          <fieldset disabled><input aria-label="f" required /></fieldset>
        </form>
      </>,
    );
    screen.getByRole('button', { name: 'outside' }).focus();
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'outside' }));
  });

  it('a legend inside a disabled fieldset stays usable (native rule)', () => {
    render(
      <form data-testid="form">
        <fieldset disabled>
          <legend><input aria-label="in-legend" aria-invalid="true" /></legend>
        </fieldset>
      </form>,
    );
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('textbox', { name: 'in-legend' }));
  });

  it('keeps mapping a hidden native input to its visible Nova control', () => {
    render(
      <form data-testid="form">
        <span data-nova-control-root="">
          <span role="checkbox" aria-checked="false" aria-label="ok" tabIndex={0} data-nova-focus-target="" />
          <input type="checkbox" required aria-hidden="true" tabIndex={-1} />
        </span>
      </form>,
    );
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('checkbox', { name: 'ok' }));
  });

  it('FormErrors only moves focus to a usable control', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input id="gone" aria-label="gone" disabled />
        <FormErrors errors={[{ id: 'e', message: 'Lỗi', fieldId: 'gone' }]} />
      </>,
    );
    const link = screen.getByRole('link', { name: 'Lỗi' });
    await user.click(link);
    expect(document.activeElement).not.toBe(screen.getByRole('textbox', { name: 'gone' }));
  });
});

// a Nova focus target that refuses focus
// (browsers ignore focus() on display:none; jsdom has no layout, so the refusal is
// simulated) must not end the search: the next usable target of the same root is tried.
describe('Nova focus mapping retries refused targets (round 2 R9)', () => {
  function HiddenChecked({ withLink = false }: { withLink?: boolean }) {
    return (
      <>
        {withLink ? <FormErrors errors={[{ id: 'e', message: 'Chọn kênh', fieldId: 'r2-root' }]} /> : null}
        <form data-testid="form">
          <span id="r2-root" data-nova-control-root="" aria-invalid="true">
            <button type="button" role="radio" aria-checked="true" aria-label="checked-hidden" data-nova-focus-target="" />
            <button type="button" role="radio" aria-checked="false" aria-label="visible" data-nova-focus-target="" />
          </span>
        </form>
      </>
    );
  }
  const refuseFocus = (element: HTMLElement) => {
    element.focus = () => {};
  };

  it('focusFirstInvalid lands on the visible fallback when the checked target refuses focus', () => {
    render(<HiddenChecked />);
    refuseFocus(screen.getByRole('radio', { name: 'checked-hidden' }));
    const target = focusFirstInvalid(screen.getByTestId('form'));
    expect(target).toBe(screen.getByRole('radio', { name: 'visible' }));
    expect(document.activeElement).toBe(target);
  });

  it('a FormErrors link lands on the visible fallback too', async () => {
    const user = userEvent.setup();
    render(<HiddenChecked withLink />);
    refuseFocus(screen.getByRole('radio', { name: 'checked-hidden' }));
    await user.click(screen.getByRole('link', { name: 'Chọn kênh' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'visible' }));
  });

  it('still prefers the checked target when it takes focus', () => {
    render(<HiddenChecked />);
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBe(screen.getByRole('radio', { name: 'checked-hidden' }));
  });

  it('returns null when every target of the root refuses focus', () => {
    render(<HiddenChecked />);
    refuseFocus(screen.getByRole('radio', { name: 'checked-hidden' }));
    refuseFocus(screen.getByRole('radio', { name: 'visible' }));
    expect(focusFirstInvalid(screen.getByTestId('form'))).toBeNull();
  });
});
