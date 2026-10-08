import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axe from 'axe-core';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Button, ButtonGroup, IconButton } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Icon = () => <svg data-testid="icon" viewBox="0 0 16 16"><path d="M2 2h12v12H2z" /></svg>;

describe('Button (C01-AC01)', () => {
  it('one click emits once', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('default type does not submit; explicit submit submits once', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const view = render(<form onSubmit={onSubmit}><Button>Plain</Button></form>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
    view.rerender(<form onSubmit={onSubmit}><Button type="submit">Send</Button></form>);
    await user.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('loading and disabled (C01-AC02)', () => {
  it('loading blocks mouse/Enter/Space, stays focusable with aria-busy and aria-disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(<form onSubmit={onSubmit}><Button type="submit" loading onClick={onClick}>Lưu thay đổi</Button></form>);
    const button = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    await user.click(button);
    button.focus();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('loading keeps the visible label (never spinner-only)', () => {
    render(<Button loading>Lưu thay đổi</Button>);
    expect(screen.getByRole('button').textContent).toContain('Lưu thay đổi');
  });

  it('disabled is native and never emits', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>X</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
    await user.click(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ref, render and IconButton (C01-AC03)', () => {
  it('ref is HTMLButtonElement', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>X</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('render element forwards props and ref to consumer button and keeps loading semantics', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(<Button ref={ref} loading onClick={onClick} data-x="1" render={<button className="consumer" type="button" />}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(ref.current).toBe(button);
    expect(button.className).toContain('consumer');
    expect(button.getAttribute('data-x')).toBe('1');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('render function receives props with ref and the state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const renderFn = vi.fn((props: object, state: { disabled: boolean; loading: boolean }) => (
      <button {...props} data-state={`${state.disabled}-${state.loading}`} />
    ));
    render(<Button ref={ref} onClick={onClick} render={renderFn}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button.getAttribute('data-state')).toBe('false-false');
    expect(ref.current).toBe(button);
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('IconButton has the label as name and hides the icon', () => {
    render(<IconButton label="Đóng" icon={<Icon />} />);
    const button = screen.getByRole('button', { name: 'Đóng' });
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
  });

  it.each([[''], ['   ']])('IconButton empty label %j renders configuration error', (label) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NovaProvider locale="en"><IconButton label={label} icon={<Icon />} /></NovaProvider>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(en.forms.configurationError)).toBeTruthy();
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_ACCESSIBLE_NAME_EMPTY'))).toBe(true);
  });
});

describe('ButtonGroup', () => {
  it('ButtonGroup is a labelled group without roving focus or toolbar', () => {
    render(<ButtonGroup label="Hành động"><Button>A</Button><Button>B</Button></ButtonGroup>);
    const group = screen.getByRole('group', { name: 'Hành động' });
    expect(group.getAttribute('role')).toBe('group');
    expect(screen.queryByRole('toolbar')).toBeNull();
    for (const button of screen.getAllByRole('button')) expect(button.getAttribute('tabindex')).toBeNull();
  });

  it('accepts aria-labelledby', () => {
    render(<><h2 id="t">Tiêu đề</h2><ButtonGroup aria-labelledby="t" orientation="vertical"><Button>A</Button></ButtonGroup></>);
    expect(screen.getByRole('group', { name: 'Tiêu đề' })).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <NovaProvider><ButtonGroup label="g"><Button>A</Button><IconButton label="Đóng" icon={<Icon />} /><Button loading>L</Button></ButtonGroup></NovaProvider>,
    );
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

// render-element events and React 19 refs.
describe('render element event composition', () => {
  it('runs the element handler first, then the Button action', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<Button onClick={() => calls.push('outer')} render={<button type="button" onClick={() => calls.push('render')} />}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(calls).toEqual(['render', 'outer']);
  });

  it('lets the element handler preventDefault before the Button action', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    render(<Button onClick={outer} render={<button type="button" onClick={(event) => event.preventDefault()} />}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(outer).not.toHaveBeenCalled();
  });

  it('loading blocks both the element handler and the Button action', async () => {
    const user = userEvent.setup();
    const inner = vi.fn();
    const outer = vi.fn();
    render(<Button loading onClick={outer} render={<button type="button" onClick={inner} />}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(inner).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
  });

  it('composes other handlers present on both (element first)', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<Button onFocus={() => calls.push('outer')} render={<button type="button" onFocus={() => calls.push('render')} />}>Go</Button>);
    await user.tab();
    expect(calls).toEqual(['render', 'outer']);
  });
});

describe('React 19 ref lifecycle', () => {
  it('callback refs that return a cleanup get it called on unmount (Button and render element)', () => {
    const events: string[] = [];
    const outer = (node: HTMLButtonElement | null) => {
      events.push(node ? 'outer:set' : 'outer:null');
      return () => {
        events.push('outer:cleanup');
      };
    };
    const inner = (node: HTMLButtonElement | null) => {
      events.push(node ? 'inner:set' : 'inner:null');
      return () => {
        events.push('inner:cleanup');
      };
    };
    const view = render(<Button ref={outer} render={<button type="button" ref={inner} />}>Go</Button>);
    expect(events).toEqual(['inner:set', 'outer:set']);
    view.unmount();
    expect(events.sort()).toEqual(['inner:cleanup', 'inner:set', 'outer:cleanup', 'outer:set']);
  });

  it('plain callback refs still receive null and object refs are cleared', () => {
    const calls: (HTMLButtonElement | null)[] = [];
    const objectRef = createRef<HTMLButtonElement>();
    const view = render(<Button ref={(node) => { calls.push(node); }} render={<button type="button" ref={objectRef} />}>Go</Button>);
    expect(calls[0]).toBeInstanceOf(HTMLButtonElement);
    expect(objectRef.current).toBe(calls[0]);
    view.unmount();
    expect(calls.at(-1)).toBeNull();
    expect(objectRef.current).toBeNull();
  });

  it('a rerender with the same refs does not detach and re-attach them', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const element = <button type="button" ref={inner} />;
    const view = render(<Button ref={outer} render={element}>Go</Button>);
    view.rerender(<Button ref={outer} render={element}>Go again</Button>);
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
